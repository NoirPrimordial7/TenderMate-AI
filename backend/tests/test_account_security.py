from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from cryptography.fernet import Fernet

from app.core.security import decrypt_mfa_secret, totp_code, verify_totp
from app.schemas.auth import UserResponse
from app.services.account_security_service import (
    AccountSecurityService,
    MfaEnrollmentRequiredError,
    RecentLoginRequiredError,
    SecurityVerificationError,
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

    def get_factor(self, _user_id):
        return self.factor

    def upsert_factor(self, user_id, ciphertext):
        self.factor = {"user_id": str(user_id), "secret_ciphertext": ciphertext, "verified_at": None}
        return self.factor

    def confirm_factor(self, _user_id):
        self.factor["verified_at"] = datetime.now(timezone.utc).isoformat()

    def delete_factor(self, _user_id):
        self.factor = None

    def replace_recovery_codes(self, user_id, hashes):
        self.recovery = [{"id": uuid4(), "user_id": user_id, "code_hash": value, "used_at": None} for value in hashes]

    def list_unused_recovery_codes(self, _user_id):
        return [row for row in self.recovery if not row["used_at"]]

    def consume_recovery_code(self, code_id):
        next(row for row in self.recovery if row["id"] == code_id)["used_at"] = datetime.now(timezone.utc).isoformat()

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

    def find_reset_token(self, token_hash):
        return next((row for row in self.reset_tokens if row["token_hash"] == token_hash), None)

    def consume_reset_token(self, token_id):
        next(row for row in self.reset_tokens if row["id"] == token_id)["used_at"] = datetime.now(timezone.utc).isoformat()

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
        session_expire_days=7,
        recent_auth_expire_minutes=10,
        password_reset_expire_minutes=30,
        turnstile_secret_key="",
        turnstile_required=False,
        jwt_secret_key="test-session-secret",
        access_token_expire_minutes=60,
    )
    repository = FakeSecurityRepository()
    auth_repository = FakeAuthRepository(user)
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
    secret, uri = service.start_mfa_setup(response_user(user))
    assert uri.startswith("otpauth://totp/")
    assert decrypt_mfa_secret(repository.factor["secret_ciphertext"], service.settings.mfa_encryption_key) == secret
    codes = service.confirm_mfa(response_user(user), totp_code(secret), None, "test-agent")
    assert len(codes) == 10
    assert auth_repository.user["mfa_enabled"] is True
    assert len(repository.list_unused_recovery_codes(user["id"])) == 10


def test_recovery_code_is_single_use(account):
    service, repository, _auth_repository, user = account
    secret, _ = service.start_mfa_setup(response_user(user))
    code = service.confirm_mfa(response_user(user), totp_code(secret), None, None)[0]
    assert service._consume_recovery_code(user["id"], code)
    assert not service._consume_recovery_code(user["id"], code)


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
    service.verify_turnstile(None, None)
    service.settings.turnstile_required = True
    with pytest.raises(RuntimeError):
        service.verify_turnstile(None, None)
