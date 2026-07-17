from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client

PAGE_COLUMNS = "id,tender_id,user_id,page_number,text,created_at"


class GeminiAnalysisRepository:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self._supabase_client = (
            supabase_client if supabase_client is not None else get_supabase_client()
        )

    def list_tender_pages(
        self,
        tender_id: UUID,
        user_id: UUID,
    ) -> list[dict[str, Any]]:
        client = self._require_supabase_client()
        return self._query_rows(
            "load tender pages",
            client.table("tender_pages")
            .select(PAGE_COLUMNS)
            .eq("tender_id", str(tender_id))
            .eq("user_id", str(user_id))
            .order("page_number"),
            table_name="tender_pages",
        )

    def save_analysis(
        self,
        tender_id: UUID,
        user_id: UUID,
        analysis_json: dict[str, Any],
    ) -> None:
        client = self._require_supabase_client()
        snapshot = analysis_json.get("snapshot") or {}
        decision = analysis_json.get("decision") or {}

        values: dict[str, Any] = {
            "status": "analyzed",
            "analysis_json": analysis_json,
            "error_message": None,
        }
        self._add_if_specific(values, "title", snapshot.get("title"))
        self._add_if_specific(values, "organization", snapshot.get("organization"))
        self._add_if_specific(values, "category", snapshot.get("category"))
        self._add_if_specific(values, "location", snapshot.get("location"))
        self._add_if_specific(values, "deadline", snapshot.get("submissionDeadline"))

        fit_score = decision.get("overallFitScore")
        if isinstance(fit_score, int):
            values["fit_score"] = fit_score

        risk_level = decision.get("riskLevel")
        if risk_level in {"Low", "Medium", "High"}:
            values["risk_level"] = risk_level

        self._execute_query(
            "save AI analysis",
            client.table("tenders")
            .update(values)
            .eq("id", str(tender_id))
            .eq("user_id", str(user_id)),
            table_name="tenders",
        )

    def mark_analysis_failed(
        self,
        tender_id: UUID,
        user_id: UUID,
        error_message: str,
    ) -> None:
        client = self._require_supabase_client()
        self._execute_query(
            "mark tender analysis failed",
            client.table("tenders")
            .update({"status": "failed", "error_message": error_message})
            .eq("id", str(tender_id))
            .eq("user_id", str(user_id)),
            table_name="tenders",
        )

    def _require_supabase_client(self) -> Any:
        if self._supabase_client is None:
            raise RuntimeError("Supabase configuration is required for AI analysis.")

        return self._supabase_client

    def _query_rows(
        self,
        action: str,
        query: Any,
        table_name: str,
    ) -> list[dict[str, Any]]:
        response = self._execute_query(action, query, table_name=table_name)
        data = getattr(response, "data", None)
        if data is None:
            return []

        if not isinstance(data, list):
            raise RuntimeError(
                f"Supabase returned an unexpected response for {action}: expected a list."
            )

        return data

    @staticmethod
    def _add_if_specific(values: dict[str, Any], key: str, value: Any) -> None:
        if isinstance(value, str) and value.strip() and value != "Not specified":
            values[key] = value.strip()

    @staticmethod
    def _execute_query(action: str, query: Any, table_name: str) -> Any:
        try:
            response = query.execute()
            error = getattr(response, "error", None)
            if error:
                raise RuntimeError(
                    f"Failed to {action} from Supabase public.{table_name}: {error}"
                )

            return response
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError(
                f"Failed to {action} from Supabase public.{table_name}. "
                "Verify Supabase credentials, table schema, and network access."
            ) from exc
