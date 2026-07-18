import hashlib
import hmac
import ipaddress
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

import httpx

from app.core.config import Settings, get_settings
from app.core.security import (
    build_totp_uri,
    create_access_token,
    create_purpose_token,
    decode_purpose_token,
    decrypt_mfa_secret,
    encrypt_mfa_secret,
    generate_recovery_codes,
    generate_totp_secret,
    hash_password,
    hash_security_token,
    matching_totp_timestep,
    verify_password,
)
from app.repositories.auth_repository import AuthRepository
from app.repositories.security_repository import SecurityRepository
from app.schemas.auth import TokenResponse, UserResponse
from app.schemas.security import SecurityEventResponse, SecurityStatusResponse, SessionResponse

logger = logging.getLogger(__name__)


class SecurityVerificationError(Exception):
    pass


class MfaEnrollmentRequiredError(Exception):
    pass


class RecentLoginRequiredError(Exception):
    pass


class TurnstileVerificationError(Exception):
    pass


class AccountSecurityService:
    def __init__(
        self,
        repository: SecurityRepository | None = None,
        auth_repository: AuthRepository | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._repository = repository
        self._auth_repository = auth_repository
        self._settings = settings

    @property
    def repository(self) -> SecurityRepository:
        if self._repository is None:
            self._repository = SecurityRepository()
        return self._repository

    @property
    def auth_repository(self) -> AuthRepository:
        if self._auth_repository is None:
            self._auth_repository = AuthRepository()
        return self._auth_repository

    @property
    def settings(self) -> Settings:
        if self._settings is None:
            self._settings = get_settings()
        return self._settings

    def verify_turnstile(
        self,
        token: str | None,
        ip_address: str | None,
        expected_action: str,
    ) -> None:
        if not self.settings.turnstile_secret_key:
            if self.settings.turnstile_required:
                raise RuntimeError("Turnstile is required but TURNSTILE_SECRET_KEY is not configured.")
            return
        if not token:
            raise TurnstileVerificationError("Complete the security check and try again.")
        try:
            response = httpx.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={
                    "secret": self.settings.turnstile_secret_key,
                    "response": token,
                    "remoteip": ip_address or "",
                    "idempotency_key": str(uuid4()),
                },
                timeout=8,
            )
            response.raise_for_status()
            result = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise TurnstileVerificationError("The security check could not be verified.") from exc
        if not result.get("success"):
            raise TurnstileVerificationError("The security check expired or was invalid.")
        allowed_hostnames = set(getattr(self.settings, "turnstile_allowed_hostnames", ()))
        if not allowed_hostnames:
            raise RuntimeError("TURNSTILE_ALLOWED_HOSTNAMES is required when Turnstile is configured.")
        if allowed_hostnames and result.get("hostname") not in allowed_hostnames:
            raise TurnstileVerificationError("The security check was issued for an unexpected hostname.")
        if result.get("action") != expected_action:
            raise TurnstileVerificationError("The security check was issued for a different action.")

    @staticmethod
    def mfa_required_for(user: dict[str, Any]) -> bool:
        return bool(user.get("mfa_enabled")) or str(user.get("role", "")).lower() in {"staff", "admin", "super_admin"}

    def create_session_token(
        self,
        user: dict[str, Any],
        ip_address: str | None,
        user_agent: str | None,
        *,
        mfa_verified: bool,
    ) -> TokenResponse:
        if self.mfa_required_for(user) and not user.get("mfa_enabled"):
            raise MfaEnrollmentRequiredError("Authenticator MFA must be enabled for this account role.")
        now = datetime.now(timezone.utc)
        # The application currently issues access tokens without a refresh-token
        # flow. Keep the revocable server session bounded by the same lifetime so
        # the session list never implies that an expired token is still usable.
        access_token_minutes = getattr(self.settings, "access_token_expire_minutes", 60)
        configured_session_expiry = now + timedelta(days=self.settings.session_expire_days)
        expires_at = min(configured_session_expiry, now + timedelta(minutes=access_token_minutes))
        session = self.repository.create_session(
            {
                "user_id": str(user["id"]),
                "created_at": now.isoformat(),
                "last_seen_at": now.isoformat(),
                "recent_auth_at": now.isoformat(),
                "expires_at": expires_at.isoformat(),
                "user_agent": (user_agent or "")[:512] or None,
                "device": self._device_name(user_agent),
                "ip_hash": self._ip_hash(ip_address),
                "ip_hint": self._ip_hint(ip_address),
                "mfa_verified": mfa_verified,
            }
        )
        response_user = UserResponse(**user)
        token = create_access_token(
            response_user.id,
            response_user.email,
            response_user.role,
            UUID(str(session["id"])),
            authenticated_at=now,
        )
        self.record_event(response_user.id, "session_created", True, ip_address, user_agent)
        return TokenResponse(access_token=token, user=response_user)

    def create_mfa_challenge(self, user_id: UUID) -> str:
        token_id = uuid4()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.settings.mfa_challenge_expire_minutes)
        token = create_purpose_token(
            user_id,
            "mfa_challenge",
            self.settings.mfa_challenge_expire_minutes,
            token_id=token_id,
        )
        self.repository.create_mfa_challenge(user_id, hash_security_token(str(token_id)), expires_at)
        return token

    def validate_session(self, user_id: UUID, session_id: UUID) -> dict[str, Any]:
        session = self.repository.get_session(session_id, user_id)
        if not session or session.get("revoked_at"):
            raise SecurityVerificationError("Session is no longer active.")
        expires_at = self._parse_datetime(session.get("expires_at"))
        if expires_at is None or expires_at <= datetime.now(timezone.utc):
            raise SecurityVerificationError("Session has expired.")
        last_seen = self._parse_datetime(session.get("last_seen_at"))
        if last_seen is None or last_seen < datetime.now(timezone.utc) - timedelta(minutes=5):
            self.repository.touch_session(session_id, user_id)
        return session

    def complete_mfa_challenge(
        self,
        challenge_token: str,
        code: str | None,
        recovery_code: str | None,
        ip_address: str | None,
        user_agent: str | None,
    ) -> TokenResponse:
        try:
            payload = decode_purpose_token(challenge_token, "mfa_challenge")
            user_id = UUID(str(payload["sub"]))
        except (KeyError, TypeError, ValueError) as exc:
            raise SecurityVerificationError("The MFA challenge expired. Sign in again.") from exc
        user = self.auth_repository.find_user_by_id(user_id)
        factor = self.repository.get_factor(user_id)
        if not user or not factor or not factor.get("verified_at") or not user.get("mfa_enabled"):
            raise SecurityVerificationError("MFA is not available for this account.")
        token_id = str(payload.get("jti") or "")
        token_id_hash = hash_security_token(token_id) if token_id else ""
        if not token_id_hash or not self.repository.get_active_mfa_challenge(user_id, token_id_hash):
            raise SecurityVerificationError("The MFA challenge has already been used or has expired.")
        self._ensure_factor_not_locked(factor)
        verified = False
        used_recovery_code = False
        if code:
            verified = self._verify_and_claim_totp(user_id, factor, code, user["email"])
        elif recovery_code:
            verified = self._consume_recovery_code(user_id, recovery_code)
            used_recovery_code = verified
        if not verified:
            if recovery_code:
                self._record_mfa_failure(user_id, user["email"])
            self.record_event(user_id, "mfa_challenge_failed", False, ip_address, user_agent)
            raise SecurityVerificationError("The authenticator or recovery code is invalid.")
        if not self.repository.consume_mfa_challenge(user_id, token_id_hash):
            raise SecurityVerificationError("The MFA challenge has already been used or has expired.")
        user = self.auth_repository.record_successful_login(
            user_id,
            datetime.now(timezone.utc),
        )
        self.record_event(user_id, "mfa_challenge_completed", True, ip_address, user_agent)
        if used_recovery_code:
            self.record_event(user_id, "recovery_code_used", True, ip_address, user_agent)
            self.queue_notification(user_id, user["email"], "recovery_code_used")
        return self.create_session_token(user, ip_address, user_agent, mfa_verified=True)

    def start_mfa_setup(self, user: UserResponse) -> tuple[str, str]:
        existing_factor = self.repository.get_factor(user.id)
        if user.mfa_enabled or (existing_factor and existing_factor.get("verified_at")):
            raise SecurityVerificationError("MFA is already enabled for this account.")
        secret = generate_totp_secret()
        ciphertext = encrypt_mfa_secret(secret, self.settings.mfa_encryption_key)
        self.repository.upsert_factor(user.id, ciphertext)
        return secret, build_totp_uri(secret, user.email)

    def cancel_mfa_setup(self, user: UserResponse) -> None:
        factor = self.repository.get_factor(user.id)
        if factor and not factor.get("verified_at"):
            self.repository.delete_factor(user.id)

    def confirm_mfa(self, user: UserResponse, session_id: UUID, code: str, ip_address: str | None, user_agent: str | None) -> list[str]:
        if user.mfa_enabled:
            raise SecurityVerificationError("MFA is already enabled for this account.")
        factor = self.repository.get_factor(user.id)
        if not factor:
            raise SecurityVerificationError("Start MFA setup before confirming it.")
        if not self._verify_and_claim_totp(user.id, factor, code, user.email):
            self.record_event(user.id, "mfa_enrollment_failed", False, ip_address, user_agent)
            raise SecurityVerificationError("The authenticator code is invalid.")
        self.repository.confirm_factor(user.id)
        self.auth_repository.set_mfa_enabled(user.id, True)
        codes = generate_recovery_codes()
        self.repository.replace_recovery_codes(user.id, [hash_password(value) for value in codes])
        self.repository.mark_session_mfa_verified(session_id, user.id)
        self.repository.revoke_sessions(user.id, except_session_id=session_id)
        self.record_event(user.id, "mfa_enabled", True, ip_address, user_agent)
        self.queue_notification(user.id, user.email, "mfa_enabled")
        return codes

    def disable_mfa(self, user: UserResponse, session_id: UUID, ip_address: str | None, user_agent: str | None) -> None:
        self.require_recent_login(user.id, session_id)
        if str(user.role).lower() in {"staff", "admin", "super_admin"}:
            raise SecurityVerificationError("MFA is mandatory for this account role.")
        self.repository.disable_mfa(user.id, session_id)
        self.record_event(user.id, "mfa_disabled", True, ip_address, user_agent)
        self.queue_notification(user.id, user.email, "mfa_disabled")

    def regenerate_recovery_codes(self, user: UserResponse, session_id: UUID, ip_address: str | None, user_agent: str | None) -> list[str]:
        self.require_recent_login(user.id, session_id)
        if not user.mfa_enabled:
            raise SecurityVerificationError("Enable MFA before generating recovery codes.")
        codes = generate_recovery_codes()
        self.repository.replace_recovery_codes(user.id, [hash_password(value) for value in codes])
        self.record_event(user.id, "recovery_codes_regenerated", True, ip_address, user_agent)
        self.queue_notification(user.id, user.email, "recovery_codes_regenerated")
        return codes

    def verify_recent_login(self, user: UserResponse, session_id: UUID, password: str, code: str | None) -> None:
        stored = self.auth_repository.find_user_by_id(user.id)
        if not stored or not verify_password(password, stored["password_hash"]):
            raise SecurityVerificationError("Password verification failed.")
        if user.mfa_enabled:
            factor = self.repository.get_factor(user.id)
            if not factor or not code:
                raise SecurityVerificationError("An authenticator code is required.")
            if not self._verify_and_claim_totp(user.id, factor, code, user.email):
                raise SecurityVerificationError("The authenticator code is invalid.")
        self.repository.mark_recent_auth(session_id, user.id)

    def require_recent_login(self, user_id: UUID, session_id: UUID) -> None:
        session = self.validate_session(user_id, session_id)
        recent = self._parse_datetime(session.get("recent_auth_at"))
        if recent is None or recent < datetime.now(timezone.utc) - timedelta(minutes=self.settings.recent_auth_expire_minutes):
            raise RecentLoginRequiredError("Verify your password again before changing this security setting.")

    def status(self, user: UserResponse, session_id: UUID) -> SecurityStatusResponse:
        session = self.validate_session(user.id, session_id)
        recent = self._parse_datetime(session.get("recent_auth_at"))
        return SecurityStatusResponse(
            mfa_enabled=user.mfa_enabled,
            mfa_required=self.mfa_required_for(user.model_dump()),
            recovery_codes_remaining=len(self.repository.list_unused_recovery_codes(user.id)),
            recent_login_valid=bool(recent and recent >= datetime.now(timezone.utc) - timedelta(minutes=self.settings.recent_auth_expire_minutes)),
        )

    def list_sessions(self, user: UserResponse, current_session_id: UUID) -> list[SessionResponse]:
        now = datetime.now(timezone.utc)
        sessions = []
        for row in self.repository.list_sessions(user.id):
            expires = self._parse_datetime(row.get("expires_at"))
            if row.get("revoked_at") or not expires or expires <= now:
                continue
            sessions.append(SessionResponse(
                id=row["id"],
                device=row.get("device") or "Unknown device",
                ip_hint=row.get("ip_hint"),
                created_at=row["created_at"],
                last_seen_at=row["last_seen_at"],
                expires_at=row["expires_at"],
                current=str(row["id"]) == str(current_session_id),
            ))
        return sessions

    def list_events(self, user_id: UUID) -> list[SecurityEventResponse]:
        return [SecurityEventResponse(**row) for row in self.repository.list_events(user_id)]

    def change_password(self, user: UserResponse, session_id: UUID, current_password: str, new_password: str, mfa_code: str | None, ip_address: str | None, user_agent: str | None) -> None:
        self.verify_recent_login(user, session_id, current_password, mfa_code)
        if current_password == new_password:
            raise SecurityVerificationError("Choose a password you have not just used.")
        self.repository.change_password(user.id, hash_password(new_password), session_id)
        self.record_event(user.id, "password_changed", True, ip_address, user_agent)
        self.queue_notification(user.id, user.email, "password_changed")

    def request_password_reset(self, email: str, ip_address: str | None, user_agent: str | None) -> None:
        user = self.auth_repository.find_user_by_email(email.strip().lower())
        if not user:
            return
        raw_token = secrets.token_urlsafe(48)
        expires = datetime.now(timezone.utc) + timedelta(minutes=self.settings.password_reset_expire_minutes)
        user_id = UUID(str(user["id"]))
        self.repository.invalidate_reset_tokens(user_id)
        self.repository.create_reset_token({
            "user_id": str(user_id),
            "token_hash": hash_security_token(raw_token),
            "expires_at": expires.isoformat(),
        })
        encrypted_delivery_token = encrypt_mfa_secret(raw_token, self.settings.mfa_encryption_key)
        self.queue_notification(user_id, user["email"], "password_reset_requested", {"token_ciphertext": encrypted_delivery_token})
        self.record_event(user_id, "password_reset_requested", True, ip_address, user_agent)

    def confirm_password_reset(self, token: str, new_password: str) -> None:
        row = self.repository.consume_valid_reset_token(hash_security_token(token))
        if not row:
            raise SecurityVerificationError("The password reset link is invalid or has already been used.")
        user_id = UUID(str(row["user_id"]))
        self.repository.complete_password_reset(user_id, hash_password(new_password))
        user = self.auth_repository.find_user_by_id(user_id)
        if user:
            self.queue_notification(user_id, user["email"], "password_reset_completed")
        self.record_event(user_id, "password_reset_completed", True, None, None)

    def record_event(self, user_id: UUID, event_type: str, success: bool, ip_address: str | None, user_agent: str | None) -> None:
        try:
            self.repository.record_event({
                "user_id": str(user_id),
                "event_type": event_type,
                "success": success,
                "device": self._device_name(user_agent),
                "ip_hint": self._ip_hint(ip_address),
            })
        except RuntimeError:
            logger.error("A security event could not be recorded (event_type=%s).", event_type)

    def queue_notification(self, user_id: UUID, email: str, event_type: str, metadata: dict[str, Any] | None = None) -> None:
        try:
            self.repository.queue_notification({
                "user_id": str(user_id),
                "recipient_email": email,
                "event_type": event_type,
                "metadata": metadata or {},
            })
        except RuntimeError:
            logger.error("A security notification could not be queued (event_type=%s).", event_type)

    def _consume_recovery_code(self, user_id: UUID, candidate: str) -> bool:
        normalized = candidate.replace("-", "").replace(" ", "").upper()
        for row in self.repository.list_unused_recovery_codes(user_id):
            if verify_password(normalized, row["code_hash"]):
                return self.repository.consume_recovery_code(UUID(str(row["id"])), user_id)
        return False

    def _decrypt_factor_secret(self, user_id: UUID, ciphertext: str) -> str:
        active_key = self.settings.mfa_encryption_key
        if not active_key:
            raise RuntimeError("MFA_ENCRYPTION_KEY is required to verify authenticator factors.")
        keys = (active_key, *getattr(self.settings, "mfa_previous_encryption_keys", ()))
        for index, encryption_key in enumerate(keys):
            try:
                secret = decrypt_mfa_secret(ciphertext, encryption_key)
            except RuntimeError:
                continue
            if index > 0:
                self.repository.rotate_factor_secret(user_id, encrypt_mfa_secret(secret, active_key))
            return secret
        raise RuntimeError("Stored MFA factor could not be decrypted with the configured key ring.")

    def _verify_and_claim_totp(self, user_id: UUID, factor: dict[str, Any], code: str, email: str | None = None) -> bool:
        self._ensure_factor_not_locked(factor)
        secret = self._decrypt_factor_secret(user_id, factor["secret_ciphertext"])
        timestep = matching_totp_timestep(secret, code, window=1)
        if timestep is not None and self.repository.claim_totp_timestep(user_id, timestep):
            return True
        self._record_mfa_failure(user_id, email)
        return False

    def _ensure_factor_not_locked(self, factor: dict[str, Any]) -> None:
        locked_until = self._parse_datetime(factor.get("locked_until"))
        if locked_until and locked_until > datetime.now(timezone.utc):
            raise SecurityVerificationError("Too many MFA attempts. Try again after the temporary lock expires.")

    def _record_mfa_failure(self, user_id: UUID, email: str | None = None) -> None:
        result = self.repository.record_mfa_failure(
            user_id,
            self.settings.mfa_failure_lock_threshold,
            self.settings.mfa_failure_lock_minutes,
        )
        if email and result and int(result.get("failed_attempts") or 0) == self.settings.mfa_failure_lock_threshold:
            self.queue_notification(user_id, email, "mfa_temporarily_locked")

    def _ip_hash(self, ip_address: str | None) -> str | None:
        if not ip_address:
            return None
        return hmac.new(self.settings.jwt_secret_key.encode("utf-8"), ip_address.encode("utf-8"), hashlib.sha256).hexdigest()

    @staticmethod
    def _ip_hint(ip_address: str | None) -> str | None:
        if not ip_address:
            return None
        try:
            address = ipaddress.ip_address(ip_address)
            network = ipaddress.ip_network(f"{address}/{'24' if address.version == 4 else '48'}", strict=False)
            return str(network)
        except ValueError:
            return None

    @staticmethod
    def _device_name(user_agent: str | None) -> str:
        value = (user_agent or "").lower()
        browser = "Browser"
        if "edg/" in value:
            browser = "Microsoft Edge"
        elif "firefox/" in value:
            browser = "Firefox"
        elif "chrome/" in value:
            browser = "Chrome"
        elif "safari/" in value:
            browser = "Safari"
        platform = "Windows" if "windows" in value else "Android" if "android" in value else "iPhone" if "iphone" in value else "macOS" if "macintosh" in value else "Linux" if "linux" in value else "device"
        return f"{browser} on {platform}"

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if isinstance(value, datetime):
            parsed = value
        elif isinstance(value, str):
            try:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return None
        else:
            return None
        return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def get_account_security_service() -> AccountSecurityService:
    return AccountSecurityService()
