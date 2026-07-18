from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Callable
from uuid import UUID

from fastapi import Depends, HTTPException, status

from app.api.dependencies.auth import AuthenticatedSession, get_current_session
from app.repositories.admin_repository import AdminRepository
from app.services.account_security_service import (
    AccountSecurityService,
    RecentLoginRequiredError,
    get_account_security_service,
)


class StaffRole(StrEnum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    SUPPORT = "support"
    FINANCE = "finance"
    REVIEWER = "reviewer"


class Permission(StrEnum):
    OVERVIEW_READ = "overview:read"
    USERS_READ = "users:read"
    USERS_STATUS = "users:status"
    STAFF_ROLES = "staff:roles"
    CREDITS_WRITE = "credits:write"
    PLANS_WRITE = "plans:write"
    SESSIONS_REVOKE = "sessions:revoke"
    TENDERS_METADATA = "tenders:metadata"
    TENDERS_REVIEW = "tenders:review"
    DOCUMENT_BREAK_GLASS = "documents:break_glass"
    FEEDBACK_WRITE = "feedback:write"
    SECURITY_READ = "security:read"
    SECURITY_RECOVERY = "security:recovery"
    SYSTEM_READ = "system:read"
    SYSTEM_WRITE = "system:write"
    AUDIT_READ = "audit:read"
    NOTES_WRITE = "notes:write"
    BILLING_READ = "billing:read"


ROLE_PERMISSIONS: dict[StaffRole, frozenset[Permission]] = {
    StaffRole.SUPER_ADMIN: frozenset(Permission),
    StaffRole.ADMIN: frozenset({Permission.OVERVIEW_READ, Permission.USERS_READ, Permission.USERS_STATUS, Permission.CREDITS_WRITE, Permission.PLANS_WRITE, Permission.SESSIONS_REVOKE, Permission.TENDERS_METADATA, Permission.FEEDBACK_WRITE, Permission.SECURITY_READ, Permission.AUDIT_READ, Permission.NOTES_WRITE, Permission.BILLING_READ, Permission.SYSTEM_READ}),
    StaffRole.SUPPORT: frozenset({Permission.OVERVIEW_READ, Permission.USERS_READ, Permission.SESSIONS_REVOKE, Permission.TENDERS_METADATA, Permission.FEEDBACK_WRITE, Permission.SECURITY_READ, Permission.NOTES_WRITE}),
    StaffRole.FINANCE: frozenset({Permission.OVERVIEW_READ, Permission.USERS_READ, Permission.BILLING_READ, Permission.AUDIT_READ}),
    StaffRole.REVIEWER: frozenset({Permission.OVERVIEW_READ, Permission.TENDERS_METADATA, Permission.TENDERS_REVIEW}),
}


@dataclass(frozen=True)
class StaffContext:
    user_id: UUID
    role: StaffRole
    permissions: frozenset[Permission]
    session_id: UUID
    recent_auth_at: datetime | str | None


def require_authenticated_user(
    current: Annotated[AuthenticatedSession, Depends(get_current_session)],
    security: Annotated[AccountSecurityService, Depends(get_account_security_service)],
    repository: Annotated[AdminRepository, Depends(AdminRepository)],
) -> StaffContext:
    identity = repository.get_staff_identity(current.user.id)
    if not identity or identity.get("account_status", "active") != "active" or not identity.get("is_active"):
        raise HTTPException(status_code=403, detail="Staff account is unavailable.")
    try:
        role = StaffRole(str(identity.get("role")))
    except ValueError:
        raise HTTPException(status_code=403, detail="Staff access required.") from None
    if not identity.get("email_verified_at"):
        raise HTTPException(status_code=403, detail="Verified email required.")
    factor = security.repository.get_factor(current.user.id)
    session = security.validate_session(current.user.id, current.session_id)
    if not identity.get("mfa_enabled") or not factor or not factor.get("verified_at"):
        raise HTTPException(status_code=403, detail="Enrolled and verified MFA required.")
    if not session.get("mfa_verified"):
        raise HTTPException(status_code=403, detail="Current MFA-assured AAL2 session required.")
    return StaffContext(
        user_id=current.user.id,
        role=role,
        permissions=ROLE_PERMISSIONS[role],
        session_id=current.session_id,
        recent_auth_at=session.get("recent_auth_at"),
    )


def require_staff_role(context: Annotated[StaffContext, Depends(require_authenticated_user)]) -> StaffContext:
    return context


def require_permission(permission: Permission) -> Callable[[StaffContext], StaffContext]:
    def guard(context: Annotated[StaffContext, Depends(require_staff_role)]) -> StaffContext:
        if permission not in context.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")
        return context
    return guard


def require_recent_authentication(
    context: Annotated[StaffContext, Depends(require_staff_role)],
    security: Annotated[AccountSecurityService, Depends(get_account_security_service)],
) -> StaffContext:
    try:
        security.require_recent_login(context.user_id, context.session_id)
    except RecentLoginRequiredError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return context
