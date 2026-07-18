from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import StrEnum
from hashlib import sha256
from typing import Annotated, Callable
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies.auth import bearer_scheme
from app.core.security import decode_access_token
from app.repositories.admin_repository import AdminRepository


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
    session_id: UUID
    authenticated_at: datetime
    mfa_assured_at: datetime


def _parse_time(value: object) -> datetime | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try: parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError: return None
    else: return None
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def require_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    repository: AdminRepository = Depends(AdminRepository),
) -> StaffContext:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(str(payload.get("sub")))
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired access token.") from None
    user = repository.get_staff_identity(user_id)
    if not user or user.get("account_status", "active") != "active" or not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Staff account is unavailable.")
    try: role = StaffRole(str(user.get("role")))
    except ValueError: raise HTTPException(status_code=403, detail="Staff access required.") from None
    if not user.get("email_verified_at"):
        raise HTTPException(status_code=403, detail="Verified email required.")
    if not user.get("mfa_enabled"):
        raise HTTPException(status_code=403, detail="MFA enrollment required.")
    session = repository.get_active_session(sha256(credentials.credentials.encode()).hexdigest())
    authenticated_at = _parse_time(session.get("authenticated_at")) if session else None
    mfa_assured_at = _parse_time(session.get("mfa_assured_at")) if session else None
    if not session or str(session.get("user_id")) != str(user_id) or not authenticated_at or not mfa_assured_at:
        raise HTTPException(status_code=403, detail="Current MFA-assured server session required.")
    return StaffContext(user_id, role, UUID(str(session["id"])), authenticated_at, mfa_assured_at)


def require_staff_role(context: Annotated[StaffContext, Depends(require_authenticated_user)]) -> StaffContext:
    return context


def require_permission(permission: Permission) -> Callable[[StaffContext], StaffContext]:
    def guard(context: Annotated[StaffContext, Depends(require_staff_role)]) -> StaffContext:
        if permission not in ROLE_PERMISSIONS[context.role]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")
        return context
    return guard


def require_recent_authentication(context: Annotated[StaffContext, Depends(require_staff_role)]) -> StaffContext:
    if datetime.now(timezone.utc) - context.authenticated_at > timedelta(minutes=15):
        raise HTTPException(status_code=403, detail="Recent authentication required.")
    return context
