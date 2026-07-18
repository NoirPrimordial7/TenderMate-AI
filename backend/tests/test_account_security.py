from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from cryptography.fernet import Fernet
from starlette.requests import Request

from app.api.dependencies.rate_limit import get_client_ip
from app.core.security import decrypt_mfa_secret, encrypt_mfa_secret, totp_code, verify_totp
from app.schemas.auth import UserResponse
from app.services.auth_service import AuthService, InvalidCredentialsError
from app.services.account_security_service import (
    AccountSecurityService,
    MfaEnrollmentRequiredError,
    RecentLoginRequiredError,
    SecurityVerificationError,
    TurnstileVerificationError,
)


class FakeAuthRepository:
    def __init__(self, user):
        self.user = user

    def find_user_by_id(self, _user_id):
        return dict(self.user)

    def find_user_by_email(self, email):
        return dict(self.user) if email == self.user["email"] else None

    def set_mfa_enabled(self, _user_id, enabled):
        self.user["mfa_enabled"] = enabled
        return dict(self.user)

    def record_successful_login(self, _user_id, timestamp):
        self.user["last_login_at"] = timestamp.isoformat()
        self.user["failed_login_count"] = 0
        return dict(self.user)

    def update_password(self, _user_id, password_hash):
        self.user["password_hash"] = password_hash
        return dict(self.user)


class FakeSecurityRepository:
    def __init__(self):
        self.factor = None
        self.recovery = []
        self.sessions = {}
        self.events = []
        self.notifications = []
        self.reset_tokens = []
        self.challenges = []
        self.auth_repository = None

    def get_factor(self, _user_id):
        return self.factor

    def upsert_factor(self, user_id, ciphertext):
        self.factor = {"user_id": str(user_id), "secret_ciphertext": ciphertext, "verified_at": None, "last_used_timestep": None, "failed_attempts": 0, "locked_until": None}
        return self.factor

    def rotate_factor_secret(self, _user_id, ciphertext):
        self.factor["secret_ciphertext"] = ciphertext

    def confirm_factor(self, _user_id):
        self.factor["verified_at"] = datetime.now(timezone.utc).isoformat()

    def delete_factor(self, _user_id):
        self.factor = None

    def replace_recovery_codes(self, user_id, hashes):
        self.recovery = [{"id": uuid4(), "user_id": user_id, "code_hash": value, "used_at": None} for value in hashes]

    def disable_mfa(self, user_id, current_session_id):
        self.factor = None
        self.recovery = []
        self.auth_repository.set_mfa_enabled(user_id, False)
        self.revoke_sessions(user_id, except_session_id=current_session_id)

    def change_password(self, user_id, password_hash, current_session_id):
        self.auth_repository.update_password(user_id, password_hash)
        self.invalidate_reset_tokens(user_id)
        self.revoke_sessions(user_id, except_session_id=current_session_id)

    def complete_password_reset(self, user_id, password_hash):
        self.auth_repository.update_password(user_id, password_hash)
        self.invalidate_reset_tokens(user_id)
        self.revoke_sessions(user_id)

    def list_unused_recovery_codes(self, _user_id):
        return [row for row in self.recovery if not row["used_at"]]

    def claim_totp_timestep(self, _user_id, timestep):
        previous = self.factor.get("last_used_timestep")
        if previous is not None and previous >= timestep:
            return False
        self.factor["last_used_timestep"] = timestep
        self.factor["failed_attempts"] = 0
        self.factor["locked_until"] = None
        return True

    def record_mfa_failure(self, _user_id, threshold, lock_minutes):
        self.factor["failed_attempts"] += 1
        if self.factor["failed_attempts"] >= threshold:
            self.factor["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=lock_minutes)).isoformat()
        return self.factor

    def consume_recovery_code(self, code_id, user_id):
        row = next((row for row in self.recovery if row["id"] == code_id and str(row["user_id"]) == str(user_id) and not row["used_at"]), None)
        if not row:
            return False
        row["used_at"] = datetime.now(timezone.utc).isoformat()
        return True

    def create_mfa_challenge(self, user_id, token_id_hash, expires_at):
        self.challenges.append({"user_id": user_id, "token_id_hash": token_id_hash, "expires_at": expires_at, "used_at": None})

    def consume_mfa_challenge(self, user_id, token_id_hash):
        row = next((row for row in self.challenges if str(row["user_id"]) == str(user_id) and row["token_id_hash"] == token_id_hash and not row["used_at"] and row["expires_at"] > datetime.now(timezone.utc)), None)
        if not row:
            return False
        row["used_at"] = datetime.now(timezone.utc)
        return True

    def get_active_mfa_challenge(self, user_id, token_id_hash):
        return next((row for row in self.challenges if str(row["user_id"]) == str(user_id) and row["token_id_hash"] == token_id_hash and not row["used_at"] and row["expires_at"] > datetime.now(timezone.utc)), None)

    def create_session(self, values):
        row = {"id": uuid4(), "revoked_at": None, **values}
        self.sessions[row["id"]] = row
        return row

    def get_session(self, session_id, user_id):
        row = self.sessions.get(session_id)
        return row if row and str(row["user_id"]) == str(user_id) else None

    def list_sessions(self, user_id):
        return [row for row in self.sessions.values() if str(row["user_id"]) == str(user_id)]

    def touch_session(self, session_id, _user_id):
        self.sessions[session_id]["last_seen_at"] = datetime.now(timezone.utc).isoformat()

    def mark_recent_auth(self, session_id, _user_id):
        self.sessions[session_id]["recent_auth_at"] = datetime.now(timezone.utc).isoformat()

    def mark_session_mfa_verified(self, session_id, _user_id):
        self.sessions[session_id]["mfa_verified"] = True

    def revoke_session(self, session_id, _user_id):
        if session_id in self.sessions:
            self.sessions[session_id]["revoked_at"] = datetime.now(timezone.utc).isoformat()

    def revoke_sessions(self, user_id, except_session_id=None):
        for session_id, row in self.sessions.items():
            if str(row["user_id"]) == str(user_id) and session_id != except_session_id:
                row["revoked_at"] = datetime.now(timezone.utc).isoformat()

    def record_event(self, values):
        self.events.append({"id": uuid4(), "created_at": datetime.now(timezone.utc).isoformat(), **values})

    def list_events(self, _user_id, limit=50):
        return self.events[:limit]

    def create_reset_token(self, values):
        self.reset_tokens.append({"id": uuid4(), "used_at": None, **values})

    def invalidate_reset_tokens(self, user_id):
        for row in self.reset_tokens:
            if str(row["user_id"]) == str(user_id) and not row["used_at"]:
                row["used_at"] = datetime.now(timezone.utc).isoformat()

    def consume_valid_reset_token(self, token_hash):
        row = next((row for row in self.reset_tokens if row["token_hash"] == token_hash and not row["used_at"] and datetime.fromisoformat(row["expires_at"]) > datetime.now(timezone.utc)), None)
        if row:
            row["used_at"] = datetime.now(timezone.utc).isoformat()
        return row

    def queue_notification(self, values):
        self.notifications.append(values)


@pytest.fixture
def account():
    user_id = uuid4()
    user = {
        "id": user_id,
        "full_name": "Security Test",
        "email": "security@example.com",
        "password_hash": "$argon2id$v=19$m=65536,t=3,p=4$fake",
        "role": "user",
        "is_active": True,
        "free_analysis_credits": 3,
        "plan_name": "free",
        "subscription_status": "trial",
        "preferred_language": "en",
        "preferred_analysis_language": "en",
        "mfa_enabled": False,
    }
    settings = SimpleNamespace(
        mfa_encryption_key=Fernet.generate_key().decode(),
        mfa_previous_encryption_keys=(),
        mfa_challenge_expire_minutes=5,
        mfa_failure_lock_threshold=5,
        mfa_failure_lock_minutes=15,
        session_expire_days=7,
        recent_auth_expire_minutes=10,
        password_reset_expire_minutes=30,
        turnstile_secret_key="",
        turnstile_required=False,
        turnstile_allowed_hostnames=(),
        jwt_secret_key="test-session-secret-with-at-least-32-bytes",
        jwt_algorithm="HS256",
        access_token_expire_minutes=60,
    )
    repository = FakeSecurityRepository()
    auth_repository = FakeAuthRepository(user)
    repository.auth_repository = auth_repository
    service = AccountSecurityService(repository, auth_repository, settings)
    return service, repository, auth_repository, user


def response_user(user):
    return UserResponse(**user)


def test_totp_matches_rfc_6238_sha1_vector():
    secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
    assert totp_code(secret, timestamp=59) == "287082"
    assert verify_totp(secret, "287082", timestamp=59)
    assert not verify_totp(secret, "000000", timestamp=59)


def test_mfa_setup_confirmation_and_recovery_codes(account):
    service, repository, auth_repository, user = account
    now = datetime.now(timezone.utc)
    session = repository.create_session({"user_id": str(user["id"]), "created_at": now.isoformat(), "last_seen_at": now.isoformat(), "recent_auth_at": now.isoformat(), "expires_at": (now + timedelta(hours=1)).isoformat(), "device": "Test", "mfa_verified": False})
    previous_session = repository.create_session({"user_id": str(user["id"]), "created_at": now.isoformat(), "last_seen_at": now.isoformat(), "recent_auth_at": now.isoformat(), "expires_at": (now + timedelta(hours=1)).isoformat(), "device": "Other", "mfa_verified": False})
    secret, uri = service.start_mfa_setup(response_user(user))
    assert uri.startswith("otpauth://totp/")
    assert decrypt_mfa_secret(repository.factor["secret_ciphertext"], service.settings.mfa_encryption_key) == secret
    codes = service.confirm_mfa(response_user(user), session["id"], totp_code(secret), None, "test-agent")
    assert len(codes) == 10
    assert auth_repository.user["mfa_enabled"] is True
    assert len(repository.list_unused_recovery_codes(user["id"])) == 10
    assert repository.sessions[session["id"]]["mfa_verified"] is True
    assert repository.sessions[previous_session["id"]]["revoked_at"] is not None


def test_recovery_code_is_single_use(account):
    service, repository, _auth_repository, user = account
    now = datetime.now(timezone.utc)
    session = repository.create_session({"user_id": str(user["id"]), "created_at": now.isoformat(), "last_seen_at": now.isoformat(), "recent_auth_at": now.isoformat(), "expires_at": (now + timedelta(hours=1)).isoformat(), "device": "Test", "mfa_verified": False})
    secret, _ = service.start_mfa_setup(response_user(user))
    code = service.confirm_mfa(response_user(user), session["id"], totp_code(secret), None, None)[0]
    assert service._consume_recovery_code(user["id"], code)
    assert not service._consume_recovery_code(user["id"], code)


def test_totp_timestep_cannot_be_claimed_twice(account):
    service, repository, _auth_repository, user = account
    secret, _ = service.start_mfa_setup(response_user(user))
    timestep = int(datetime.now(timezone.utc).timestamp() // 30)
    assert repository.claim_totp_timestep(user["id"], timestep)
    assert not repository.claim_totp_timestep(user["id"], timestep)


def test_previous_mfa_key_is_rotated_on_successful_decryption(account):
    service, repository, _auth_repository, user = account
    previous_key = Fernet.generate_key().decode()
    service.settings.mfa_previous_encryption_keys = (previous_key,)
    secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
    repository.upsert_factor(user["id"], encrypt_mfa_secret(secret, previous_key))

    assert service._decrypt_factor_secret(user["id"], repository.factor["secret_ciphertext"]) == secret
    assert decrypt_mfa_secret(repository.factor["secret_ciphertext"], service.settings.mfa_encryption_key) == secret


def test_mfa_failures_create_a_temporary_account_lock(account):
    service, repository, _auth_repository, user = account
    service.start_mfa_setup(response_user(user))
    for _ in range(service.settings.mfa_failure_lock_threshold):
        repository.record_mfa_failure(user["id"], service.settings.mfa_failure_lock_threshold, service.settings.mfa_failure_lock_minutes)
    assert datetime.fromisoformat(repository.factor["locked_until"]) > datetime.now(timezone.utc)


def test_mfa_challenge_and_recovery_code_are_single_use(account, monkeypatch):
    service, repository, _auth_repository, user = account
    monkeypatch.setattr("app.core.security.get_settings", lambda: service.settings)
    now = datetime.now(timezone.utc)
    enrollment_session = repository.create_session({"user_id": str(user["id"]), "created_at": now.isoformat(), "last_seen_at": now.isoformat(), "recent_auth_at": now.isoformat(), "expires_at": (now + timedelta(hours=1)).isoformat(), "device": "Test", "mfa_verified": False})
    secret, _ = service.start_mfa_setup(response_user(user))
    recovery_codes = service.confirm_mfa(response_user(user), enrollment_session["id"], totp_code(secret), None, "test-agent")
    challenge = service.create_mfa_challenge(user["id"])

    service.complete_mfa_challenge(challenge, None, recovery_codes[0], None, "test-agent")
    remaining_after_success = len(repository.list_unused_recovery_codes(user["id"]))
    assert remaining_after_success == 9
    assert any(event["event_type"] == "recovery_code_used" for event in repository.events)
    assert any(notification["event_type"] == "recovery_code_used" for notification in repository.notifications)

    with pytest.raises(SecurityVerificationError):
        service.complete_mfa_challenge(challenge, None, recovery_codes[1], None, "test-agent")
    assert len(repository.list_unused_recovery_codes(user["id"])) == remaining_after_success


def test_privileged_role_requires_mfa(account):
    service, _repository, _auth_repository, user = account
    user["role"] = "admin"
    with pytest.raises(MfaEnrollmentRequiredError):
        service.create_session_token(user, None, None, mfa_verified=False)


def test_revoked_and_cross_user_sessions_are_rejected(account):
    service, repository, _auth_repository, user = account
    now = datetime.now(timezone.utc)
    session = repository.create_session({"user_id": str(user["id"]), "created_at": now.isoformat(), "last_seen_at": now.isoformat(), "recent_auth_at": now.isoformat(), "expires_at": (now + timedelta(hours=1)).isoformat(), "device": "Test"})
    service.validate_session(user["id"], session["id"])
    assert repository.get_session(session["id"], uuid4()) is None
    repository.revoke_session(session["id"], user["id"])
    with pytest.raises(SecurityVerificationError):
        service.validate_session(user["id"], session["id"])


def test_mfa_required_user_cannot_keep_a_password_only_session(account, monkeypatch):
    security_service, _repository, auth_repository, user = account
    monkeypatch.setattr("app.core.security.get_settings", lambda: security_service.settings)
    token = security_service.create_session_token(user, None, "test-agent", mfa_verified=False)
    auth_repository.user["mfa_enabled"] = True
    auth_service = AuthService(auth_repository, security_service.settings, security_service)

    with pytest.raises(InvalidCredentialsError):
        auth_service.get_current_user_from_token(token.access_token)


def test_recent_login_expires(account):
    service, repository, _auth_repository, user = account
    now = datetime.now(timezone.utc)
    session = repository.create_session({"user_id": str(user["id"]), "created_at": now.isoformat(), "last_seen_at": now.isoformat(), "recent_auth_at": (now - timedelta(minutes=11)).isoformat(), "expires_at": (now + timedelta(hours=1)).isoformat(), "device": "Test"})
    with pytest.raises(RecentLoginRequiredError):
        service.require_recent_login(user["id"], session["id"])


def test_password_reset_is_one_time_and_revokes_sessions(account):
    service, repository, auth_repository, user = account
    previous_password_hash = user["password_hash"]
    service.request_password_reset(user["email"], None, None)
    ciphertext = repository.notifications[-1]["metadata"]["token_ciphertext"]
    token = decrypt_mfa_secret(ciphertext, service.settings.mfa_encryption_key)
    service.confirm_password_reset(token, "a-different-strong-password")
    assert auth_repository.user["password_hash"] != previous_password_hash
    with pytest.raises(SecurityVerificationError):
        service.confirm_password_reset(token, "another-different-password")


def test_new_password_reset_invalidates_the_previous_link(account):
    service, repository, _auth_repository, user = account
    service.request_password_reset(user["email"], None, None)
    first_token = decrypt_mfa_secret(repository.notifications[-1]["metadata"]["token_ciphertext"], service.settings.mfa_encryption_key)
    service.request_password_reset(user["email"], None, None)
    second_token = decrypt_mfa_secret(repository.notifications[-1]["metadata"]["token_ciphertext"], service.settings.mfa_encryption_key)

    with pytest.raises(SecurityVerificationError):
        service.confirm_password_reset(first_token, "a-different-strong-password")
    service.confirm_password_reset(second_token, "a-different-strong-password")


def test_turnstile_can_be_disabled_but_required_config_fails_closed(account):
    service, _repository, _auth_repository, _user = account
    service.verify_turnstile(None, None, "login")
    service.settings.turnstile_required = True
    with pytest.raises(RuntimeError):
        service.verify_turnstile(None, None, "login")


def test_turnstile_rejects_wrong_hostname_and_action(account, monkeypatch):
    service, _repository, _auth_repository, _user = account
    service.settings.turnstile_secret_key = "server-secret"
    service.settings.turnstile_required = True
    service.settings.turnstile_allowed_hostnames = ("nividaiq.in",)

    class Response:
        def __init__(self, payload):
            self.payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self.payload

    monkeypatch.setattr(
        "app.services.account_security_service.httpx.post",
        lambda *args, **kwargs: Response({"success": True, "hostname": "attacker.example", "action": "login"}),
    )
    with pytest.raises(TurnstileVerificationError):
        service.verify_turnstile("token", None, "login")

    monkeypatch.setattr(
        "app.services.account_security_service.httpx.post",
        lambda *args, **kwargs: Response({"success": True, "hostname": "nividaiq.in", "action": "signup"}),
    )
    with pytest.raises(TurnstileVerificationError):
        service.verify_turnstile("token", None, "login")


def test_forwarded_ip_is_used_only_from_a_trusted_proxy(monkeypatch):
    request = Request({
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [(b"x-forwarded-for", b"203.0.113.44")],
        "client": ("198.51.100.12", 443),
        "server": ("test", 80),
        "scheme": "http",
        "query_string": b"",
    })
    monkeypatch.setattr(
        "app.api.dependencies.rate_limit.get_settings",
        lambda: SimpleNamespace(trusted_proxy_cidrs=()),
    )
    assert get_client_ip(request) == "198.51.100.12"

    monkeypatch.setattr(
        "app.api.dependencies.rate_limit.get_settings",
        lambda: SimpleNamespace(trusted_proxy_cidrs=("198.51.100.0/24",)),
    )
    assert get_client_ip(request) == "203.0.113.44"


def test_security_migration_keeps_secret_tables_service_role_only():
    migration = (Path(__file__).parents[2] / "database" / "migrations" / "20260718_add_account_security_mfa.sql").read_text(encoding="utf-8").lower()
    for table in (
        "user_mfa_factors",
        "user_mfa_recovery_codes",
        "mfa_login_challenges",
        "user_sessions",
        "password_reset_tokens",
        "account_security_events",
        "security_notification_outbox",
    ):
        assert f"alter table public.{table} enable row level security" in migration
        assert f"revoke all on public.{table} from anon, authenticated" in migration
    assert "security definer" not in migration
    assert "security invoker" in migration
