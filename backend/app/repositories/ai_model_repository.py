from __future__ import annotations

from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client


class AIModelRepository:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self._supabase_client = (
            supabase_client if supabase_client is not None else get_supabase_client()
        )

    def record_model_run(self, values: dict[str, Any]) -> dict[str, Any] | None:
        client = self._require_client()
        response = self._execute(
            client.table("ai_model_runs").insert(values),
            "record AI model run",
        )
        data = getattr(response, "data", None)
        return data[0] if isinstance(data, list) and data else None

    def create_feedback(
        self,
        *,
        user_id: UUID,
        tender_id: UUID,
        model_run_id: UUID | None,
        field_path: str,
        feedback_type: str,
        original_value: Any,
        corrected_value: Any,
        source_page: int | None,
        source_quote: str | None,
    ) -> dict[str, Any]:
        client = self._require_client()
        values = {
            "user_id": str(user_id),
            "tender_id": str(tender_id),
            "model_run_id": str(model_run_id) if model_run_id else None,
            "field_path": field_path,
            "feedback_type": feedback_type,
            "original_value": original_value,
            "corrected_value": corrected_value,
            "source_page": source_page,
            "source_quote": source_quote,
        }
        response = self._execute(
            client.table("ai_output_feedback").insert(values),
            "record AI output feedback",
        )
        data = getattr(response, "data", None)
        if not isinstance(data, list) or not data:
            raise RuntimeError("Feedback storage returned no created row.")
        return data[0]

    def model_run_belongs_to_tender(
        self,
        *,
        model_run_id: UUID,
        tender_id: UUID,
        user_id: UUID,
    ) -> bool:
        response = self._execute(
            self._require_client()
            .table("ai_model_runs")
            .select("id")
            .eq("id", str(model_run_id))
            .eq("tender_id", str(tender_id))
            .eq("user_id", str(user_id))
            .limit(1),
            "verify AI model run ownership",
        )
        data = getattr(response, "data", None)
        return isinstance(data, list) and bool(data)

    def create_training_example(
        self, values: dict[str, Any], *, is_admin: bool
    ) -> dict[str, Any]:
        if not is_admin:
            raise PermissionError("Training examples are backend/admin-only.")
        response = self._execute(
            self._require_client().table("ai_training_examples").insert(values),
            "create AI training example",
        )
        data = getattr(response, "data", None)
        if not isinstance(data, list) or not data:
            raise RuntimeError("Training example storage returned no created row.")
        return data[0]

    def update_training_review(
        self,
        example_id: UUID,
        values: dict[str, Any],
        *,
        is_admin: bool,
    ) -> dict[str, Any]:
        if not is_admin:
            raise PermissionError("Training review is backend/admin-only.")
        response = self._execute(
            self._require_client()
            .table("ai_training_examples")
            .update(values)
            .eq("id", str(example_id)),
            "review AI training example",
        )
        data = getattr(response, "data", None)
        if not isinstance(data, list) or not data:
            raise RuntimeError("Training example was not found.")
        return data[0]

    def list_training_examples_for_export(
        self, *, is_admin: bool
    ) -> list[dict[str, Any]]:
        if not is_admin:
            raise PermissionError("Training dataset export is backend/admin-only.")
        response = self._execute(
            self._require_client()
            .table("ai_training_examples")
            .select("*")
            .eq("review_status", "approved")
            .eq("training_consent", True)
            .eq("is_anonymized", True),
            "export approved AI training examples",
        )
        data = getattr(response, "data", None)
        if data is None:
            return []
        if not isinstance(data, list):
            raise RuntimeError("Training export returned an unexpected response.")
        return data

    def _require_client(self) -> Any:
        if self._supabase_client is None:
            raise RuntimeError("Supabase configuration is required for AI observability.")
        return self._supabase_client

    @staticmethod
    def _execute(query: Any, action: str) -> Any:
        try:
            response = query.execute()
            error = getattr(response, "error", None)
            if error:
                raise RuntimeError(f"Failed to {action}.")
            return response
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError(f"Failed to {action}.") from exc
