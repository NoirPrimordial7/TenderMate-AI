from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client


class LaunchRepository:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self._client = supabase_client if supabase_client is not None else get_supabase_client()
        if self._client is None:
            raise RuntimeError("Launch persistence requires Supabase configuration.")

    @staticmethod
    def _rows(response: Any, action: str) -> list[dict[str, Any]]:
        error = getattr(response, "error", None)
        if error:
            raise RuntimeError(f"Unable to {action}.")
        return list(getattr(response, "data", None) or [])

    def list_acceptances(self, user_id: UUID, version: str) -> list[dict[str, Any]]:
        response = self._client.table("user_legal_acceptances").select("document_type,document_version,locale,accepted_at").eq("user_id", str(user_id)).eq("document_version", version).execute()
        return self._rows(response, "read legal acceptances")

    def record_acceptances(self, user_id: UUID, locale: str, version: str) -> list[dict[str, Any]]:
        values = [{"user_id": str(user_id), "document_type": item, "document_version": version, "locale": locale} for item in ("terms", "privacy", "ai_disclaimer")]
        response = self._client.table("user_legal_acceptances").upsert(values, on_conflict="user_id,document_type,document_version").execute()
        return self._rows(response, "record legal acceptances")

    def set_training_consent(self, user_id: UUID, allowed: bool) -> None:
        response = self._client.table("app_users").update({"training_consent": allowed}).eq("id", str(user_id)).execute()
        self._rows(response, "update training consent")

    def get_training_consent(self, user_id: UUID) -> bool:
        response = self._client.table("app_users").select("training_consent").eq("id", str(user_id)).limit(1).execute()
        rows = self._rows(response, "read training consent")
        return bool(rows and rows[0].get("training_consent"))

    def create_feedback(self, values: dict[str, Any]) -> dict[str, Any]:
        response = self._client.table("product_feedback").insert(values).select("id,status,created_at").execute()
        rows = self._rows(response, "record product feedback")
        if not rows:
            raise RuntimeError("Unable to record product feedback.")
        return rows[0]

    def list_feedback(self, user_id: UUID) -> list[dict[str, Any]]:
        response = self._client.table("product_feedback").select("id,status,created_at").eq("user_id", str(user_id)).order("created_at", desc=True).execute()
        return self._rows(response, "read product feedback")
