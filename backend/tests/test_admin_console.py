from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.dependencies.admin import (
    Permission,
    ROLE_PERMISSIONS,
    StaffContext,
    StaffRole,
    require_authenticated_user,
    require_permission,
    require_recent_authentication,
)
from app.api.dependencies.auth import AuthenticatedSession
from app.schemas.admin import AdminNoteCreate
from app.schemas.auth import UserResponse
from app.services.account_security_service import RecentLoginRequiredError
from app.services.admin_service import AdminService, assert_secret_free


def context(role: StaffRole) -> StaffContext:
    return StaffContext(uuid4(), role, ROLE_PERMISSIONS[role], uuid4(), datetime.now(timezone.utc))


def response_user(role: str = "admin") -> UserResponse:
    return UserResponse(id=uuid4(), full_name="Staff User", email="staff@example.com", role=role, is_active=True, free_analysis_credits=3, plan_name="free", subscription_status="trial", mfa_enabled=True, email_verified_at=datetime.now(timezone.utc))


class AssuranceRepository:
    def __init__(self, user: UserResponse): self.user = user
    def get_staff_identity(self, _):
        return {"id": self.user.id, "role": self.user.role, "is_active": self.user.is_active, "account_status": "active", "email_verified_at": self.user.email_verified_at, "mfa_enabled": self.user.mfa_enabled}


class AssuranceSecurity:
    def __init__(self, *, aal2: bool):
        self.repository = SimpleNamespace(get_factor=lambda _user_id: {"verified_at": datetime.now(timezone.utc).isoformat()})
        self.session = {"id": uuid4(), "mfa_verified": aal2, "recent_auth_at": datetime.now(timezone.utc).isoformat()}
    def validate_session(self, _user_id, _session_id): return self.session
    def require_recent_login(self, _user_id, _session_id): return None


def test_admin_is_blocked_at_aal1_and_allowed_at_aal2():
    user = response_user()
    current = AuthenticatedSession(user, uuid4())
    with pytest.raises(HTTPException) as denied:
        require_authenticated_user(current, AssuranceSecurity(aal2=False), AssuranceRepository(user))
    assert denied.value.status_code == 403
    allowed = require_authenticated_user(current, AssuranceSecurity(aal2=True), AssuranceRepository(user))
    assert allowed.role == StaffRole.ADMIN
    assert allowed.session_id == current.session_id


def test_ordinary_user_cannot_enter_admin_authorization():
    user = response_user("msme_user")
    with pytest.raises(HTTPException) as denied:
        require_authenticated_user(AuthenticatedSession(user, uuid4()), AssuranceSecurity(aal2=True), AssuranceRepository(user))
    assert denied.value.status_code == 403


def test_role_matrix_is_least_privilege():
    assert Permission.STAFF_ROLES in ROLE_PERMISSIONS[StaffRole.SUPER_ADMIN]
    assert Permission.STAFF_ROLES not in ROLE_PERMISSIONS[StaffRole.ADMIN]
    assert Permission.CREDITS_WRITE not in ROLE_PERMISSIONS[StaffRole.SUPPORT]
    assert Permission.TENDERS_METADATA not in ROLE_PERMISSIONS[StaffRole.FINANCE]
    assert Permission.CREDITS_WRITE not in ROLE_PERMISSIONS[StaffRole.REVIEWER]


@pytest.mark.parametrize("role,permission", [(StaffRole.SUPPORT, Permission.USERS_STATUS), (StaffRole.FINANCE, Permission.TENDERS_METADATA), (StaffRole.REVIEWER, Permission.CREDITS_WRITE)])
def test_forbidden_role_actions_return_403(role: StaffRole, permission: Permission):
    with pytest.raises(HTTPException) as denied: require_permission(permission)(context(role))
    assert denied.value.status_code == 403


def test_sensitive_actions_reuse_account_security_recent_authentication():
    class Expired(AssuranceSecurity):
        def require_recent_login(self, _user_id, _session_id): raise RecentLoginRequiredError("Recent authentication required.")
    with pytest.raises(HTTPException) as denied: require_recent_authentication(context(StaffRole.ADMIN), Expired(aal2=True))
    assert denied.value.status_code == 403
    assert require_recent_authentication(context(StaffRole.ADMIN), AssuranceSecurity(aal2=True)).role == StaffRole.ADMIN


@pytest.mark.parametrize("field", ["password_hash", "totp_secret", "secret_ciphertext", "encrypted_totp_secret", "recovery_code_hash", "code_hash", "reset_token_hash", "access_token", "refresh_token", "token_hash", "api_key", "service_role_key", "payment_credentials"])
def test_secret_fields_never_serialize(field: str):
    with pytest.raises(RuntimeError): assert_secret_free({"id": str(uuid4()), field: "never"})


def test_admin_notes_sanitize_and_reject_secret_material():
    assert AdminNoteCreate(category="support", note="  User requested  a callback. ").note == "User requested a callback."
    with pytest.raises(ValidationError): AdminNoteCreate(category="support", note="password=secret")


class FakeRepository:
    def __init__(self, role="admin"):
        self.user = {"id": uuid4(), "role": role, "account_status": "active", "is_active": True, "email_verified_at": datetime.now(timezone.utc), "mfa_enabled": True}
        self.revoked = False; self.audited = False
    def get_user(self, _): return self.user
    def update_user(self, _, values): self.user.update(values); return self.user
    def revoke_sessions(self, *_): self.revoked = True; return 1
    def audit(self, *_args, **_kwargs): self.audited = True
    def count(self, *_args, **_kwargs): return 1


def test_suspension_revokes_authoritative_sessions_and_audits():
    repo = FakeRepository(); service = AdminService(repo)  # type: ignore[arg-type]
    service.change_status(context(StaffRole.ADMIN), uuid4(), "suspended", "confirmed abuse investigation")
    assert repo.revoked and repo.audited and repo.user["is_active"] is False


def test_last_super_admin_cannot_be_removed():
    repo = FakeRepository("super_admin"); service = AdminService(repo)  # type: ignore[arg-type]
    with pytest.raises(HTTPException) as denied: service.change_role(context(StaffRole.SUPER_ADMIN), uuid4(), "admin", "organization change")
    assert denied.value.status_code == 409


def test_role_change_revokes_account_security_sessions_and_audits():
    repo = FakeRepository("admin"); repo.count = lambda *_args, **_kwargs: 2  # type: ignore[method-assign]
    service = AdminService(repo)  # type: ignore[arg-type]
    service.change_role(context(StaffRole.SUPER_ADMIN), uuid4(), "support", "approved responsibility change")
    assert repo.user["role"] == "support"
    assert repo.revoked and repo.audited


def test_admin_migration_does_not_duplicate_account_security_authority():
    root = Path(__file__).parents[2]
    security = (root / "database/migrations/20260718_add_account_security_mfa.sql").read_text(encoding="utf-8").lower()
    admin = (root / "database/migrations/20260718_add_nividaiq_admin_console.sql").read_text(encoding="utf-8").lower()
    assert "create table if not exists public.user_sessions" in security
    assert "email_verified_at" in security
    assert "create table if not exists public.app_sessions" not in admin
    assert "create table if not exists public.user_sessions" not in admin
    assert "token_hash" not in admin
    assert "add column if not exists mfa_enabled" not in admin
    assert sorted(path.name for path in (root / "database/migrations").glob("*.sql")).index("20260718_add_account_security_mfa.sql") < sorted(path.name for path in (root / "database/migrations").glob("*.sql")).index("20260718_add_nividaiq_admin_console.sql")
    for table in ("admin_audit_events", "admin_notes", "credit_ledger", "tender_support_access_grants"):
        assert f"create table if not exists public.{table}" in admin
        assert f"alter table public.{table} enable row level security" in admin
    assert "grant execute on function public.admin_adjust_credit" in admin
    assert "grant execute on function public.admin_console_overview() to service_role" in admin
    assert "security definer" not in admin
