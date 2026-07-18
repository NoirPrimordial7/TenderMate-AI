from typing import Any
from uuid import UUID

from fastapi import HTTPException

from app.api.dependencies.admin import StaffContext, StaffRole
from app.repositories.admin_repository import AdminRepository
from app.schemas.admin import AdminUserSummary

SECRET_FIELD_NAMES = frozenset({"password_hash", "totp_secret", "secret_ciphertext", "encrypted_totp_secret", "recovery_code_hash", "code_hash", "reset_token_hash", "access_token", "refresh_token", "token_hash", "api_key", "service_role_key", "payment_credentials"})


def assert_secret_free(value: Any) -> None:
    if isinstance(value, dict):
        for key, nested in value.items():
            if key.lower() in SECRET_FIELD_NAMES: raise RuntimeError("Secret field reached admin serializer.")
            assert_secret_free(nested)
    elif isinstance(value, list):
        for nested in value: assert_secret_free(nested)


class AdminService:
    def __init__(self, repository: AdminRepository | None = None) -> None:
        self.repository = repository or AdminRepository()

    @staticmethod
    def user_summary(row: dict[str, Any], tender_count: int = 0) -> AdminUserSummary:
        assert_secret_free(row)
        flags = []
        if int(row.get("failed_login_count") or 0) > 0: flags.append("failed_login")
        if row.get("locked_until"): flags.append("temporary_lock")
        return AdminUserSummary(id=row["id"], full_name=row["full_name"], email=row["email"], account_status=row.get("account_status", "active"), email_verified=bool(row.get("email_verified_at")), mfa_enabled=bool(row.get("mfa_enabled")), role=row["role"], plan_name=row["plan_name"], subscription_status=row["subscription_status"], analysis_credits=max(0, int(row.get("free_analysis_credits") or 0)), question_credits=max(0, int(row.get("question_credits") or 0)), tender_count=tender_count, last_active_at=row.get("last_active_at") or row.get("last_login_at"), created_at=row["created_at"], security_flags=flags)

    def change_status(self, actor: StaffContext, target_id: UUID, new_status: str, reason: str) -> dict[str, Any]:
        if actor.user_id == target_id and new_status != "active": raise HTTPException(409, "Staff cannot suspend or restrict their own account.")
        target = self.repository.get_user(target_id)
        if not target: raise HTTPException(404, "User not found.")
        updated = self.repository.update_user(target_id, {"account_status": new_status, "is_active": new_status == "active"})
        if new_status != "active": self.repository.revoke_sessions(target_id, f"account status changed: {reason}")
        self.repository.audit(actor, f"user_{new_status}", "user", str(target_id), reason, {"previous_status": target.get("account_status")})
        return updated

    def change_role(self, actor: StaffContext, target_id: UUID, new_role: str, reason: str) -> dict[str, Any]:
        if actor.user_id == target_id: raise HTTPException(409, "Self-promotion and self-demotion are not allowed.")
        if actor.role != StaffRole.SUPER_ADMIN: raise HTTPException(403, "Only super_admin may change staff roles.")
        target = self.repository.get_user(target_id)
        if not target: raise HTTPException(404, "User not found.")
        if target.get("role") == "super_admin" and new_role != "super_admin" and self.repository.count("app_users", filters=[("eq", "role", "super_admin"), ("eq", "account_status", "active")]) <= 1:
            raise HTTPException(409, "The last active super_admin cannot be removed.")
        updated = self.repository.update_user(target_id, {"role": new_role})
        self.repository.revoke_sessions(target_id, "staff role changed")
        self.repository.audit(actor, "staff_role_changed", "user", str(target_id), reason, {"previous_role": target.get("role"), "new_role": new_role})
        return updated
