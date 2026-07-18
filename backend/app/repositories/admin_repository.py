import base64
import re
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client
from app.repositories.security_repository import SecurityRepository

SAFE_USER_COLUMNS = "id,full_name,email,role,is_active,account_status,email_verified_at,mfa_enabled,plan_name,subscription_status,free_analysis_credits,question_credits,failed_login_count,locked_until,last_active_at,last_login_at,created_at,preferred_language,preferred_analysis_language,training_consent"


class AdminRepository:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self.client = supabase_client if supabase_client is not None else get_supabase_client()
        if self.client is None: raise RuntimeError("Admin persistence requires backend service credentials.")
        self.security_repository = SecurityRepository(self.client)

    @staticmethod
    def rows(response: Any, action: str) -> list[dict[str, Any]]:
        if getattr(response, "error", None): raise RuntimeError(f"Unable to {action}.")
        data = getattr(response, "data", None)
        if data is None: return []
        if not isinstance(data, list): raise RuntimeError(f"Unexpected response while attempting to {action}.")
        return data

    def get_staff_identity(self, user_id: UUID) -> dict[str, Any] | None:
        rows = self.rows(self.client.table("app_users").select("id,role,is_active,account_status,email_verified_at,mfa_enabled").eq("id", str(user_id)).limit(1).execute(), "read staff identity")
        return rows[0] if rows else None

    def get_user(self, user_id: UUID) -> dict[str, Any] | None:
        rows = self.rows(self.client.table("app_users").select(SAFE_USER_COLUMNS).eq("id", str(user_id)).limit(1).execute(), "read user")
        return rows[0] if rows else None

    def list_users(self, *, limit: int, cursor: str | None = None, search: str | None = None, role: str | None = None, account_status: str | None = None, plan: str | None = None, email_verified: bool | None = None, mfa_enabled: bool | None = None, low_credit: bool | None = None) -> tuple[list[dict[str, Any]], str | None]:
        query = self.client.table("app_users").select(SAFE_USER_COLUMNS).order("created_at", desc=True).order("id", desc=True).limit(limit + 1)
        if cursor:
            try: cursor_time = base64.urlsafe_b64decode(cursor + "===").decode()
            except Exception as exc: raise ValueError("Invalid cursor.") from exc
            query = query.lt("created_at", cursor_time)
        if search:
            normalized = re.sub(r"[^\w\s@.+-]", "", search.strip(), flags=re.UNICODE)[:100]
            if normalized: query = query.or_(f"full_name.ilike.%{normalized}%,email.ilike.%{normalized}%")
        if role: query = query.eq("role", role)
        if account_status: query = query.eq("account_status", account_status)
        if plan: query = query.eq("plan_name", plan)
        if email_verified is True: query = query.not_.is_("email_verified_at", "null")
        if email_verified is False: query = query.is_("email_verified_at", "null")
        if mfa_enabled is not None: query = query.eq("mfa_enabled", mfa_enabled)
        if low_credit: query = query.lte("free_analysis_credits", 2)
        rows = self.rows(query.execute(), "list users")
        has_more = len(rows) > limit
        rows = rows[:limit]
        next_cursor = base64.urlsafe_b64encode(str(rows[-1]["created_at"]).encode()).decode().rstrip("=") if has_more and rows else None
        return rows, next_cursor

    def count(self, table: str, *, filters: list[tuple[str, str, Any]] | None = None) -> int:
        query = self.client.table(table).select("id", count="exact", head=True)
        for operator, field, value in filters or []:
            if operator == "not_is": query = query.not_.is_(field, value)
            else: query = getattr(query, operator)(field, value)
        response = query.execute()
        return int(getattr(response, "count", 0) or 0)

    def overview(self) -> dict[str, Any]:
        response = self.client.rpc("admin_console_overview").execute()
        data = getattr(response, "data", None)
        if not isinstance(data, dict): raise RuntimeError("Unable to aggregate admin overview metrics.")
        return data

    def tender_counts(self, user_ids: list[str]) -> dict[str, int]:
        if not user_ids: return {}
        rows = self.rows(self.client.table("tenders").select("user_id").in_("user_id", user_ids).execute(), "count user tenders")
        result: dict[str, int] = {}
        for row in rows: result[str(row["user_id"])] = result.get(str(row["user_id"]), 0) + 1
        return result

    def list_rows(self, table: str, columns: str, limit: int = 50, **equals: Any) -> list[dict[str, Any]]:
        query = self.client.table(table).select(columns)
        for key, value in equals.items():
            if value is not None: query = query.eq(key, str(value))
        return self.rows(query.order("created_at", desc=True).limit(min(limit, 100)).execute(), f"list {table}")

    def audit(self, actor: Any, action: str, target_type: str, target_id: str | None, reason: str, metadata: dict[str, Any] | None = None) -> None:
        safe_metadata = {k: v for k, v in (metadata or {}).items() if k.lower() not in {"password", "token", "secret", "document", "authorization"}}
        self.rows(self.client.table("admin_audit_events").insert({"actor_user_id": str(actor.user_id), "actor_role": actor.role.value, "action": action, "target_type": target_type, "target_id": target_id, "reason": reason, "metadata": safe_metadata}).execute(), "write admin audit event")

    def update_user(self, user_id: UUID, values: dict[str, Any]) -> dict[str, Any]:
        rows = self.rows(self.client.table("app_users").update(values).eq("id", str(user_id)).select(SAFE_USER_COLUMNS).execute(), "update user")
        if not rows: raise LookupError("User not found.")
        return rows[0]

    def revoke_sessions(self, user_id: UUID, reason: str, session_id: UUID | None = None) -> int:
        active = [row for row in self.security_repository.list_sessions(user_id) if not row.get("revoked_at")]
        if session_id:
            self.security_repository.revoke_session(session_id, user_id)
            return int(any(str(row.get("id")) == str(session_id) for row in active))
        self.security_repository.revoke_sessions(user_id)
        return len(active)

    def adjust_credit(self, user_id: UUID, actor_id: UUID, values: dict[str, Any]) -> dict[str, Any]:
        response = self.client.rpc("admin_adjust_credit", {"p_user_id": str(user_id), "p_credit_type": values["credit_type"], "p_amount": values["amount"], "p_reason_category": values["reason_category"], "p_internal_note": values["internal_note"], "p_actor_user_id": str(actor_id), "p_idempotency_key": str(values["idempotency_key"])}).execute()
        rows = self.rows(response, "adjust credits")
        if not rows: raise RuntimeError("Credit adjustment returned no result.")
        return rows[0]
