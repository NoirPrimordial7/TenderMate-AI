from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client


def record_audit_log(
    action: str,
    user_id: UUID | None = None,
    resource_type: str | None = None,
    resource_id: UUID | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    metadata: dict[str, Any] | None = None,
    supabase_client: Any | None = None,
) -> None:
    client = supabase_client if supabase_client is not None else get_supabase_client()
    if client is None:
        return

    try:
        response = (
            client.table("audit_logs")
            .insert(
                {
                    "user_id": str(user_id) if user_id else None,
                    "action": action,
                    "resource_type": resource_type,
                    "resource_id": str(resource_id) if resource_id else None,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "metadata": metadata,
                }
            )
            .execute()
        )
        error = getattr(response, "error", None)
        if error:
            return
    except Exception:
        return
