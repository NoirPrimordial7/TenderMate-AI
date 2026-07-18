from datetime import datetime
from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client

CHAT_COLUMNS = (
    "id,conversation_id,tender_id,role,content,language,scope_status,"
    "confidence,citations,not_found,created_at"
)


class TenderQuestionRepository:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self._supabase_client = supabase_client if supabase_client is not None else get_supabase_client()

    def list_history(self, tender_id: UUID, user_id: UUID, after: datetime | None = None) -> list[dict[str, Any]]:
        client = self._require_client()
        query = (
            client.table("tender_chat_messages")
            .select(CHAT_COLUMNS)
            .eq("tender_id", str(tender_id))
            .eq("user_id", str(user_id))
        )
        if after is not None:
            query = query.gt("created_at", after.isoformat())
        return self._query_rows(
            "load tender question history",
            query.order("created_at"),
        )

    def list_conversation(self, tender_id: UUID, user_id: UUID, conversation_id: UUID) -> list[dict[str, Any]]:
        client = self._require_client()
        return self._query_rows(
            "load tender conversation",
            client.table("tender_chat_messages")
            .select(CHAT_COLUMNS)
            .eq("tender_id", str(tender_id))
            .eq("user_id", str(user_id))
            .eq("conversation_id", str(conversation_id))
            .order("created_at"),
        )

    def create_exchange(
        self,
        *,
        tender_id: UUID,
        user_id: UUID,
        conversation_id: UUID,
        question: str,
        answer: str,
        language: str,
        scope_status: str,
        confidence: float | None,
        citations: list[dict[str, Any]],
        not_found: bool,
    ) -> list[dict[str, Any]]:
        client = self._require_client()
        rows = [
            {
                "conversation_id": str(conversation_id),
                "user_id": str(user_id),
                "tender_id": str(tender_id),
                "role": "user",
                "content": question,
                "language": language,
                "scope_status": scope_status,
                "confidence": None,
                "citations": [],
                "not_found": False,
            },
            {
                "conversation_id": str(conversation_id),
                "user_id": str(user_id),
                "tender_id": str(tender_id),
                "role": "assistant",
                "content": answer,
                "language": language,
                "scope_status": scope_status,
                "confidence": confidence,
                "citations": citations,
                "not_found": not_found,
            },
        ]
        return self._query_rows(
            "store tender question exchange",
            client.table("tender_chat_messages").insert(rows).select(CHAT_COLUMNS),
        )

    def count_billable_questions(self, user_id: UUID, since: datetime) -> int:
        client = self._require_client()
        response = self._execute(
            "count tender questions",
            client.table("tender_chat_messages")
            .select("id", count="exact")
            .eq("user_id", str(user_id))
            .eq("role", "assistant")
            .in_("scope_status", ["accepted", "uncertain"])
            .gte("created_at", since.isoformat()),
        )
        count = getattr(response, "count", None)
        if isinstance(count, int):
            return count
        data = getattr(response, "data", None)
        return len(data) if isinstance(data, list) else 0

    def delete_history(self, tender_id: UUID, user_id: UUID) -> None:
        client = self._require_client()
        self._execute(
            "delete tender question history",
            client.table("tender_chat_messages")
            .delete()
            .eq("tender_id", str(tender_id))
            .eq("user_id", str(user_id)),
        )

    def _require_client(self) -> Any:
        if self._supabase_client is None:
            raise RuntimeError("Tender assistant storage is not configured.")
        return self._supabase_client

    def _query_rows(self, action: str, query: Any) -> list[dict[str, Any]]:
        response = self._execute(action, query)
        data = getattr(response, "data", None)
        if data is None:
            return []
        if not isinstance(data, list):
            raise RuntimeError(f"Supabase returned an unexpected response while attempting to {action}.")
        return data

    @staticmethod
    def _execute(action: str, query: Any) -> Any:
        try:
            response = query.execute()
            if getattr(response, "error", None):
                raise RuntimeError(f"Failed to {action}.")
            return response
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError(f"Failed to {action}.") from exc
