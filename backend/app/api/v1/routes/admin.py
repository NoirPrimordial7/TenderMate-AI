from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies.admin import Permission, StaffContext, require_permission, require_recent_authentication
from app.repositories.admin_repository import AdminRepository
from app.schemas.admin import AccountStatusChange, AdminNoteCreate, AdminOverview, AdminUserPage, CreditAdjustment, FeedbackUpdate, ReasonedAction, StaffRoleChange
from app.services.admin_service import AdminService, assert_secret_free

router = APIRouter(prefix="/admin", tags=["admin"])


def service() -> AdminService: return AdminService()


@router.get("/overview", response_model=AdminOverview)
def overview(actor: Annotated[StaffContext, Depends(require_permission(Permission.OVERVIEW_READ))], repo: Annotated[AdminRepository, Depends(AdminRepository)]) -> AdminOverview:
    return AdminOverview(metrics=repo.overview(), system_health="operational", staff_role=actor.role.value, permissions=sorted(permission.value for permission in actor.permissions))


@router.get("/users", response_model=AdminUserPage)
def users(
    _: Annotated[StaffContext, Depends(require_permission(Permission.USERS_READ))],
    admin: Annotated[AdminService, Depends(service)],
    limit: int = Query(40, ge=25, le=50), cursor: str | None = None,
    search: str | None = Query(None, max_length=100), role: str | None = None,
    account_status: str | None = None, plan: str | None = None,
    email_verified: bool | None = None, mfa_enabled: bool | None = None, low_credit: bool | None = None,
) -> AdminUserPage:
    try: rows, next_cursor = admin.repository.list_users(limit=limit, cursor=cursor, search=search, role=role, account_status=account_status, plan=plan, email_verified=email_verified, mfa_enabled=mfa_enabled, low_credit=low_credit)
    except ValueError as exc: raise HTTPException(422, str(exc)) from exc
    counts = admin.repository.tender_counts([str(row["id"]) for row in rows])
    return AdminUserPage(items=[admin.user_summary(row, counts.get(str(row["id"]), 0)) for row in rows], next_cursor=next_cursor)


@router.get("/users/{user_id}")
def user_detail(user_id: UUID, _: Annotated[StaffContext, Depends(require_permission(Permission.USERS_READ))], repo: Annotated[AdminRepository, Depends(AdminRepository)]) -> dict[str, Any]:
    user = repo.get_user(user_id)
    if not user: raise HTTPException(404, "User not found.")
    result = {
        "user": user,
        "credit_history": repo.list_rows("credit_ledger", "id,credit_type,amount,reason_category,internal_note,actor_user_id,related_tender_id,related_payment_id,created_at", user_id=user_id),
        "legal_acceptances": repo.list_rows("user_legal_acceptances", "id,document_type,document_version,locale,accepted_at,created_at", user_id=user_id),
        "feedback": repo.list_rows("product_feedback", "id,tender_id,category,message,locale,page_path,performance_mode,status,assigned_staff_id,internal_notes,created_at", user_id=user_id),
        "sessions": repo.list_rows("user_sessions", "id,device,ip_hint,mfa_verified,recent_auth_at,last_seen_at,expires_at,revoked_at,created_at", user_id=user_id),
        "notes": repo.list_rows("admin_notes", "id,category,note,author_staff_id,created_at", user_id=user_id),
        "payments": None,
    }
    assert_secret_free(result)
    return result


@router.post("/users/{user_id}/status")
def change_status(user_id: UUID, payload: AccountStatusChange, actor: Annotated[StaffContext, Depends(require_permission(Permission.USERS_STATUS))], _recent: Annotated[StaffContext, Depends(require_recent_authentication)], admin: Annotated[AdminService, Depends(service)]) -> dict[str, Any]:
    expected = "SUSPEND" if payload.status == "suspended" else payload.status.upper()
    if payload.confirmation != expected: raise HTTPException(422, f"Type {expected} to confirm.")
    return admin.change_status(actor, user_id, payload.status, payload.reason)


@router.post("/users/{user_id}/role")
def change_role(user_id: UUID, payload: StaffRoleChange, actor: Annotated[StaffContext, Depends(require_permission(Permission.STAFF_ROLES))], _recent: Annotated[StaffContext, Depends(require_recent_authentication)], admin: Annotated[AdminService, Depends(service)]) -> dict[str, Any]:
    if payload.confirmation != f"ROLE {payload.role.upper()}": raise HTTPException(422, "Typed role confirmation does not match.")
    return admin.change_role(actor, user_id, payload.role, payload.reason)


@router.post("/users/{user_id}/sessions/revoke")
def revoke_sessions(user_id: UUID, payload: ReasonedAction, actor: Annotated[StaffContext, Depends(require_permission(Permission.SESSIONS_REVOKE))], _recent: Annotated[StaffContext, Depends(require_recent_authentication)], repo: Annotated[AdminRepository, Depends(AdminRepository)]) -> dict[str, int]:
    if payload.confirmation != "REVOKE": raise HTTPException(422, "Type REVOKE to confirm.")
    count = repo.revoke_sessions(user_id, payload.reason)
    repo.audit(actor, "sessions_revoked", "user", str(user_id), payload.reason, {"revoked_count": count})
    return {"revoked": count}


@router.post("/users/{user_id}/credits", status_code=status.HTTP_201_CREATED)
def adjust_credits(user_id: UUID, payload: CreditAdjustment, actor: Annotated[StaffContext, Depends(require_permission(Permission.CREDITS_WRITE))], _recent: Annotated[StaffContext, Depends(require_recent_authentication)], repo: Annotated[AdminRepository, Depends(AdminRepository)]) -> dict[str, Any]:
    if abs(payload.amount) >= 1000 and payload.confirmation != "ADJUST CREDITS": raise HTTPException(422, "Large adjustments require typed confirmation.")
    try: result = repo.adjust_credit(user_id, actor.user_id, payload.model_dump())
    except RuntimeError as exc:
        if "duplicate" in str(exc).lower(): raise HTTPException(409, "Duplicate credit adjustment.") from exc
        raise
    repo.audit(actor, "credit_adjusted", "user", str(user_id), payload.reason_category, {"credit_type": payload.credit_type, "amount": payload.amount, "ledger_id": result.get("ledger_id")})
    return result


@router.post("/users/{user_id}/notes", status_code=status.HTTP_201_CREATED)
def add_note(user_id: UUID, payload: AdminNoteCreate, actor: Annotated[StaffContext, Depends(require_permission(Permission.NOTES_WRITE))], repo: Annotated[AdminRepository, Depends(AdminRepository)]) -> dict[str, Any]:
    rows = repo.rows(repo.client.table("admin_notes").insert({"user_id": str(user_id), "author_staff_id": str(actor.user_id), **payload.model_dump()}).select("id,user_id,author_staff_id,category,note,created_at").execute(), "create admin note")
    repo.audit(actor, "admin_note_created", "user", str(user_id), payload.category, {"note_id": rows[0]["id"]})
    return rows[0]


@router.get("/tenders")
def tenders(_: Annotated[StaffContext, Depends(require_permission(Permission.TENDERS_METADATA))], repo: Annotated[AdminRepository, Depends(AdminRepository)], limit: int = Query(40, ge=1, le=50)) -> list[dict[str, Any]]:
    return repo.list_rows("tenders", "id,user_id,title,status,page_count,document_validation_status,created_at,updated_at", limit)


@router.get("/analyses")
def analyses(_: Annotated[StaffContext, Depends(require_permission(Permission.TENDERS_METADATA))], repo: Annotated[AdminRepository, Depends(AdminRepository)], limit: int = Query(40, ge=1, le=50)) -> list[dict[str, Any]]:
    return repo.list_rows("ai_model_runs", "id,user_id,tender_id,task,provider,model_name,prompt_version,schema_version,status,latency_ms,validation_passed,error_category,created_at", limit)


@router.get("/feedback")
def feedback(_: Annotated[StaffContext, Depends(require_permission(Permission.FEEDBACK_WRITE))], repo: Annotated[AdminRepository, Depends(AdminRepository)], limit: int = Query(40, ge=1, le=50)) -> list[dict[str, Any]]:
    return repo.list_rows("product_feedback", "id,user_id,tender_id,category,message,locale,page_path,performance_mode,status,assigned_staff_id,internal_notes,created_at", limit)


@router.patch("/feedback/{feedback_id}")
def update_feedback(feedback_id: UUID, payload: FeedbackUpdate, actor: Annotated[StaffContext, Depends(require_permission(Permission.FEEDBACK_WRITE))], repo: Annotated[AdminRepository, Depends(AdminRepository)]) -> dict[str, Any]:
    rows = repo.rows(repo.client.table("product_feedback").update({"status": payload.status, "assigned_staff_id": str(payload.assigned_staff_id) if payload.assigned_staff_id else None, "internal_notes": payload.internal_notes}).eq("id", str(feedback_id)).select("id,status,assigned_staff_id,internal_notes,created_at").execute(), "update feedback")
    if not rows: raise HTTPException(404, "Feedback not found.")
    repo.audit(actor, "feedback_changed", "feedback", str(feedback_id), payload.reason, {"status": payload.status})
    return rows[0]


@router.get("/security")
def security_events(_: Annotated[StaffContext, Depends(require_permission(Permission.SECURITY_READ))], repo: Annotated[AdminRepository, Depends(AdminRepository)], limit: int = Query(50, ge=1, le=100)) -> list[dict[str, Any]]:
    return repo.list_rows("account_security_events", "id,user_id,event_type,success,device,ip_hint,created_at", limit)


@router.get("/system")
def system(_: Annotated[StaffContext, Depends(require_permission(Permission.SYSTEM_READ))], repo: Annotated[AdminRepository, Depends(AdminRepository)]) -> dict[str, Any]:
    return {"status": "operational", "notification_outbox_backlog": None, "billing": "not_available_yet", "database": "configured" if repo.client else "unavailable"}


@router.get("/audit")
def audit(_: Annotated[StaffContext, Depends(require_permission(Permission.AUDIT_READ))], repo: Annotated[AdminRepository, Depends(AdminRepository)], limit: int = Query(50, ge=1, le=100)) -> list[dict[str, Any]]:
    return repo.list_rows("admin_audit_events", "id,actor_user_id,actor_role,action,target_type,target_id,reason,metadata,correlation_id,created_at", limit)
