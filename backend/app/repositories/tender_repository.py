from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.db.supabase_client import get_supabase_client
from app.schemas.tender import TenderResponse

MOCK_TENDER_ID = UUID("11111111-1111-1111-1111-111111111111")

TENDER_COLUMNS = (
    "id,"
    "title,"
    "organization,"
    "category,"
    "location,"
    "deadline,"
    "risk_level,"
    "fit_score,"
    "status,"
    "analysis_json,"
    "original_file_name,"
    "error_message,"
    "extracted_text_preview,"
    "page_count,"
    "extraction_method,"
    "ocr_used,"
    "ocr_confidence,"
    "document_type,"
    "document_validation_status,"
    "document_validation_confidence,"
    "document_validation_reason,"
    "created_at,"
    "updated_at"
)

MOCK_ANALYSIS_JSON = {
    "id": str(MOCK_TENDER_ID),
    "snapshot": {
        "title": "Mock Municipal Office Furniture Tender",
        "tenderId": "TMAI/MOCK/2026/001",
        "organization": "Demo Municipal Corporation",
        "location": "Pune, Maharashtra",
        "category": "Office Supplies",
        "estimatedValue": "Rs 12 Lakh",
        "emdAmount": "Rs 24,000",
        "submissionDeadline": "30 June 2026",
        "contractDuration": "30 days",
    },
    "decision": {
        "shouldApply": "Review",
        "recommendation": "Placeholder analysis only. Full AI analysis will be added later.",
        "overallFitScore": 72,
        "riskLevel": "Medium",
        "deadlineUrgency": "Medium",
        "missingCriticalRequirements": 1,
    },
    "scores": [
        {"label": "Overall Fit", "value": 72, "display": "72%"},
        {"label": "Document Readiness", "value": 65, "display": "65%"},
    ],
    "beforeApply": [
        {"label": "Verify eligibility criteria", "status": "warning"},
        {"label": "Confirm EMD payment readiness", "status": "ready"},
    ],
    "documents": [],
    "eligibility": [],
    "financials": [],
    "technical": [],
    "dates": [
        {"label": "Last Submission Date", "date": "30 June 2026", "status": "upcoming"},
    ],
    "risks": [],
    "missingInformation": ["Original PDF extraction has not been implemented yet."],
    "departmentQuestions": ["Can the department confirm delivery location and warranty terms?"],
    "proposalDraft": "This is a placeholder proposal draft for backend testing.",
}


class TenderRepository:
    def __init__(self, supabase_client: Any | None = None) -> None:
        self._supabase_client = (
            supabase_client if supabase_client is not None else get_supabase_client()
        )
        now = datetime.now(timezone.utc)
        self._tenders = [
            TenderResponse(
                id=MOCK_TENDER_ID,
                title="Mock Municipal Office Furniture Tender",
                organization="Demo Municipal Corporation",
                category="Office Supplies",
                location="Pune, Maharashtra",
                deadline="30 June 2026",
                risk_level="Medium",
                fit_score=72,
                status="uploaded",
                analysis_json=MOCK_ANALYSIS_JSON,
                created_at=now,
                updated_at=now,
            )
        ]

    def list_tenders(
        self,
        user_id: UUID | None = None,
        *,
        limit: int | None = None,
        cursor: datetime | None = None,
        updated_since: datetime | None = None,
    ) -> list[TenderResponse]:
        if self._supabase_client is None:
            rows = self._tenders
            if cursor is not None:
                rows = [item for item in rows if item.created_at < cursor]
            if updated_since is not None:
                rows = [item for item in rows if item.updated_at >= updated_since]
            return rows[:limit] if limit is not None else rows

        query = self._supabase_client.table("tenders").select(TENDER_COLUMNS)
        if user_id is not None:
            query = query.eq("user_id", str(user_id))
        if cursor is not None:
            query = query.lt("created_at", cursor.isoformat())
        if updated_since is not None:
            query = query.gte("updated_at", updated_since.isoformat())
        query = query.order("created_at", desc=True)
        if limit is not None:
            query = query.limit(limit)

        rows = self._query_tenders(
            "list tenders",
            query,
        )

        return [self._row_to_tender(row) for row in rows]

    def get_latest_tender(self, user_id: UUID | None = None) -> TenderResponse | None:
        if self._supabase_client is None:
            return self._tenders[0] if self._tenders else None

        query = self._supabase_client.table("tenders").select(TENDER_COLUMNS)
        if user_id is not None:
            query = query.eq("user_id", str(user_id))

        rows = self._query_tenders(
            "get latest tender",
            query.order("created_at", desc=True).limit(1),
        )

        return self._row_to_tender(rows[0]) if rows else None

    def get_tender_by_id(
        self,
        tender_id: UUID,
        user_id: UUID | None = None,
    ) -> TenderResponse | None:
        if self._supabase_client is None:
            return next(
                (tender for tender in self._tenders if tender.id == tender_id),
                None,
            )

        query = (
            self._supabase_client.table("tenders")
            .select(TENDER_COLUMNS)
            .eq("id", str(tender_id))
        )
        if user_id is not None:
            query = query.eq("user_id", str(user_id))

        rows = self._query_tenders(
            f"get tender {tender_id}",
            query.limit(1),
        )

        return self._row_to_tender(rows[0]) if rows else None

    def create_uploaded_tender(
        self,
        user_id: UUID,
        title: str,
        original_file_name: str,
    ) -> TenderResponse:
        if self._supabase_client is None:
            raise RuntimeError("Supabase configuration is required for PDF upload.")

        rows = self._query_tenders(
            "create uploaded tender",
            self._supabase_client.table("tenders")
            .insert(
                {
                    "user_id": str(user_id),
                    "title": title,
                    "status": "uploaded",
                    "analysis_json": None,
                    "original_file_name": original_file_name,
                    "error_message": None,
                }
            )
            .select(TENDER_COLUMNS),
        )
        if not rows:
            raise RuntimeError("Supabase did not return the created tenders row.")

        return self._row_to_tender(rows[0])

    def mark_tender_upload_failed(
        self,
        tender_id: UUID,
        user_id: UUID,
        error_message: str,
    ) -> None:
        if self._supabase_client is None:
            return

        self._query_tenders(
            f"mark tender {tender_id} upload failed",
            self._supabase_client.table("tenders")
            .update({"status": "upload_failed", "error_message": error_message})
            .eq("id", str(tender_id))
            .eq("user_id", str(user_id))
            .select(TENDER_COLUMNS),
        )

    def _query_tenders(self, action: str, query: Any) -> list[dict[str, Any]]:
        try:
            response = query.execute()
            error = getattr(response, "error", None)
            if error:
                raise RuntimeError(
                    f"Failed to {action} from Supabase public.tenders: {error}"
                )

            data = getattr(response, "data", None)
            if data is None:
                return []

            if not isinstance(data, list):
                raise RuntimeError(
                    f"Supabase returned an unexpected response for {action}: expected a list."
                )

            return data
        except RuntimeError:
            raise
        except Exception as exc:
            raise RuntimeError(
                f"Failed to {action} from Supabase public.tenders. "
                "Verify Supabase credentials, table schema, and network access."
            ) from exc

    @staticmethod
    def _row_to_tender(row: dict[str, Any]) -> TenderResponse:
        try:
            return TenderResponse(**row)
        except Exception as exc:
            raise RuntimeError(
                "Supabase public.tenders returned a row that does not match "
                "the TenderResponse schema."
            ) from exc
