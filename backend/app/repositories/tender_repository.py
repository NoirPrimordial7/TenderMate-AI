from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from app.db.supabase_client import get_supabase_client
from app.schemas.tender import TenderResponse
from app.schemas.upload import UploadResponse

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

    def list_tenders(self) -> list[TenderResponse]:
        if self._supabase_client is None:
            return self._tenders

        rows = self._query_tenders(
            "list tenders",
            self._supabase_client.table("tenders")
            .select(TENDER_COLUMNS)
            .order("created_at", desc=True),
        )

        return [self._row_to_tender(row) for row in rows]

    def get_latest_tender(self) -> TenderResponse | None:
        if self._supabase_client is None:
            return self._tenders[0] if self._tenders else None

        rows = self._query_tenders(
            "get latest tender",
            self._supabase_client.table("tenders")
            .select(TENDER_COLUMNS)
            .order("created_at", desc=True)
            .limit(1),
        )

        return self._row_to_tender(rows[0]) if rows else None

    def get_tender_by_id(self, tender_id: UUID) -> TenderResponse | None:
        if self._supabase_client is None:
            return next(
                (tender for tender in self._tenders if tender.id == tender_id),
                None,
            )

        rows = self._query_tenders(
            f"get tender {tender_id}",
            self._supabase_client.table("tenders")
            .select(TENDER_COLUMNS)
            .eq("id", str(tender_id))
            .limit(1),
        )

        return self._row_to_tender(rows[0]) if rows else None

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

    def create_upload_placeholder(
        self,
        file_name: str,
        file_size: int | None,
        mime_type: str | None,
    ) -> UploadResponse:
        latest_tender = self.get_latest_tender()
        tender_id = latest_tender.id if latest_tender else MOCK_TENDER_ID

        return UploadResponse(
            id=uuid4(),
            tender_id=tender_id,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
            storage_bucket=None,
            storage_path=None,
            pdf_url=None,
            created_at=datetime.now(timezone.utc),
            status="accepted",
            message="Upload endpoint is wired with a placeholder response. PDF extraction and AI analysis are not enabled yet.",
        )
