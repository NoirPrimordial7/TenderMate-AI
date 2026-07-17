from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from app.core.config import Settings, get_settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserPreferencesUpdate, UserResponse
from app.services.audit_service import record_audit_log


class EmailAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InactiveUserError(Exception):
    pass


class AccountLockedError(Exception):
    pass


class AuthService:
    def __init__(
        self,
        repository: AuthRepository | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._repository = repository
        self._settings = settings

    @property
    def repository(self) -> AuthRepository:
        if self._repository is None:
            self._repository = AuthRepository()

        return self._repository

    @property
    def settings(self) -> Settings:
        if self._settings is None:
            self._settings = get_settings()

        return self._settings

    def signup(
        self,
        request: SignupRequest,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        email = self._normalize_email(request.email)
        existing_user = self.repository.find_user_by_email(email)
        if existing_user is not None:
            raise EmailAlreadyExistsError("Email already exists.")

        user = self.repository.create_user(
            full_name=request.full_name.strip(),
            email=email,
            password_hash=hash_password(request.password),
            free_analysis_credits=self.settings.free_analysis_credits_default,
            preferred_language=request.preferred_language,
            preferred_analysis_language=request.preferred_analysis_language,
        )
        record_audit_log(
            action="signup",
            user_id=user["id"],
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"email": email},
        )
        return self._token_response(user)

    def login(
        self,
        request: LoginRequest,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        email = self._normalize_email(request.email)
        user = self.repository.find_user_by_email(email)
        if user is None:
            record_audit_log(
                action="login_failed",
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"email": email, "reason": "unknown_user"},
            )
            raise InvalidCredentialsError("Invalid email or password.")

        if self._is_locked(user):
            record_audit_log(
                action="account_locked",
                user_id=user["id"],
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"reason": "locked_login_attempt"},
            )
            raise AccountLockedError(
                "Account temporarily locked due to multiple failed login attempts."
            )

        if not verify_password(request.password, user["password_hash"]):
            updated_user = self._record_failed_login(user)
            record_audit_log(
                action="login_failed",
                user_id=user["id"],
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={
                    "reason": "invalid_password",
                    "failed_login_count": updated_user.get("failed_login_count"),
                },
            )
            if self._is_locked(updated_user):
                record_audit_log(
                    action="account_locked",
                    user_id=user["id"],
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata={"reason": "failed_login_threshold"},
                )
                raise AccountLockedError(
                    "Account temporarily locked due to multiple failed login attempts."
                )

            raise InvalidCredentialsError("Invalid email or password.")

        if not user["is_active"]:
            raise InactiveUserError("User account is inactive.")

        logged_in_user = self.repository.record_successful_login(
            user_id=UUID(str(user["id"])),
            last_login_at=datetime.now(timezone.utc),
        )
        record_audit_log(
            action="login_success",
            user_id=logged_in_user["id"],
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return self._token_response(logged_in_user)

    def update_preferences(
        self,
        user_id: UUID,
        preferences: UserPreferencesUpdate,
    ) -> UserResponse:
        user = self.repository.update_language_preferences(
            user_id=user_id,
            preferred_language=preferences.preferred_language,
            preferred_analysis_language=preferences.preferred_analysis_language,
        )
        return self._user_response(user)

    def get_current_user_from_token(self, token: str) -> UserResponse:
        try:
            payload = decode_access_token(token)
            user_id = UUID(str(payload.get("sub")))
        except (TypeError, ValueError):
            raise InvalidCredentialsError("Invalid or expired access token.") from None

        user = self.repository.find_user_by_id(user_id)
        if user is None:
            raise InvalidCredentialsError("Invalid or expired access token.")

        if not user["is_active"]:
            raise InactiveUserError("User account is inactive.")

        if self._is_locked(user):
            raise AccountLockedError(
                "Account temporarily locked due to multiple failed login attempts."
            )

        return self._user_response(user)

    def _record_failed_login(self, user: dict[str, Any]) -> dict[str, Any]:
        next_count = int(user.get("failed_login_count") or 0) + 1
        locked_until = None
        if next_count >= self.settings.failed_login_lock_threshold:
            locked_until = datetime.now(timezone.utc) + timedelta(
                minutes=self.settings.failed_login_lock_minutes
            )

        return self.repository.record_failed_login(
            user_id=UUID(str(user["id"])),
            failed_login_count=next_count,
            locked_until=locked_until,
        )

    def _is_locked(self, user: dict[str, Any]) -> bool:
        locked_until = self._parse_datetime(user.get("locked_until"))
        if locked_until is None:
            return False

        return locked_until > datetime.now(timezone.utc)

    def _token_response(self, user: dict) -> TokenResponse:
        response_user = self._user_response(user)
        access_token = create_access_token(
            user_id=response_user.id,
            email=response_user.email,
            role=response_user.role,
        )

        return TokenResponse(access_token=access_token, user=response_user)

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    @staticmethod
    def _user_response(user: dict) -> UserResponse:
        return UserResponse(**user)

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if value is None:
            return None

        if isinstance(value, datetime):
            parsed = value
        elif isinstance(value, str):
            try:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return None
        else:
            return None

        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)

        return parsed.astimezone(timezone.utc)


def get_auth_service() -> AuthService:
    return AuthService()
