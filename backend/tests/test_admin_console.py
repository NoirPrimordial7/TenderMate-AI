from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.dependencies.admin import Permission, ROLE_PERMISSIONS, StaffContext, StaffRole, require_permission, require_recent_authentication
from app.schemas.admin import AdminNoteCreate
from app.services.admin_service import AdminService, assert_secret_free


def context(role: StaffRole, *, minutes_old: int = 0) -> StaffContext:
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    return StaffContext(uuid4(), role, uuid4(), now - timedelta(minutes=minutes_old), now)


def test_role_matrix_is_least_privilege():
    assert Permission.STAFF_ROLES in ROLE_PERMISSIONS[StaffRole.SUPER_ADMIN]
    assert Permission.STAFF_ROLES not in ROLE_PERMISSIONS[StaffRole.ADMIN]
    assert Permission.CREDITS_WRITE not in ROLE_PERMISSIONS[StaffRole.SUPPORT]
    assert Permission.BILLING_READ in ROLE_PERMISSIONS[StaffRole.FINANCE]
    assert Permission.USERS_STATUS not in ROLE_PERMISSIONS[StaffRole.REVIEWER]


def test_permission_guard_returns_403():
    with pytest.raises(HTTPException) as denied:
        require_permission(Permission.CREDITS_WRITE)(context(StaffRole.SUPPORT))
    assert denied.value.status_code == 403


def test_sensitive_actions_require_recent_authentication():
    with pytest.raises(HTTPException) as denied:
        require_recent_authentication(context(StaffRole.ADMIN, minutes_old=16))
    assert denied.value.status_code == 403
    assert require_recent_authentication(context(StaffRole.ADMIN, minutes_old=14)).role == StaffRole.ADMIN


@pytest.mark.parametrize("field", ["password_hash", "totp_secret", "encrypted_totp_secret", "recovery_code_hash", "reset_token_hash", "access_token", "refresh_token", "token_hash", "api_key", "service_role_key", "payment_credentials"])
def test_secret_fields_never_serialize(field: str):
    with pytest.raises(RuntimeError): assert_secret_free({"id": str(uuid4()), field: "never"})


def test_user_summary_is_safe_and_flags_locks():
    row = {"id": uuid4(), "full_name": "Safe User", "email": "safe@example.com", "role": "msme_user", "account_status": "active", "email_verified_at": None, "mfa_enabled": False, "plan_name": "free", "subscription_status": "trial", "free_analysis_credits": 2, "question_credits": 4, "failed_login_count": 1, "locked_until": datetime.now(timezone.utc), "created_at": datetime.now(timezone.utc)}
    result = AdminService.user_summary(row, 3)
    assert result.tender_count == 3
    assert result.security_flags == ["failed_login", "temporary_lock"]
    assert "password_hash" not in result.model_dump()


def test_admin_notes_sanitize_and_reject_secret_material():
    assert AdminNoteCreate(category="support", note="  User requested  a callback. ").note == "User requested a callback."
    with pytest.raises(ValidationError): AdminNoteCreate(category="support", note="password=secret")


class FakeRepository:
    def __init__(self):
        self.user = {"id": uuid4(), "role": "admin", "account_status": "active", "is_active": True}
        self.revoked = False
        self.audited = False
    def get_user(self, _): return self.user
    def update_user(self, _, values): self.user.update(values); return self.user
    def revoke_sessions(self, *_): self.revoked = True; return 1
    def audit(self, *_args, **_kwargs): self.audited = True


def test_suspension_revokes_sessions_and_audits():
    repo = FakeRepository(); service = AdminService(repo)  # type: ignore[arg-type]
    actor = context(StaffRole.ADMIN); target = uuid4()
    service.change_status(actor, target, "suspended", "confirmed abuse investigation")
    assert repo.revoked and repo.audited and repo.user["is_active"] is False


def test_self_suspension_is_rejected():
    service = AdminService(FakeRepository())  # type: ignore[arg-type]
    actor = context(StaffRole.ADMIN)
    with pytest.raises(HTTPException) as denied: service.change_status(actor, actor.user_id, "suspended", "mistake")
    assert denied.value.status_code == 409
