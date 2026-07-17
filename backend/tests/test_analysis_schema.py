import unittest
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.analysis import TenderAnalysisPayload
from app.schemas.tender import TenderResponse


class AnalysisSchemaTests(unittest.TestCase):
    def test_schema_v2_optional_fields_validate(self) -> None:
        payload = TenderAnalysisPayload(schemaVersion="2.0", readiness={"documentsScore": 70}, analysisSummary={"executiveSummary": "Review first"})
        self.assertEqual(payload.schemaVersion, "2.0")
        self.assertEqual(payload.readiness.documentsScore, 70)

    def test_schema_v1_payload_remains_compatible(self) -> None:
        payload = TenderAnalysisPayload(schemaVersion="1.0", documents=[{"name": "GST", "priority": "Required", "status": "Not Verified", "source": {"page": 1}}])
        self.assertEqual(payload.schemaVersion, "1.0")
        self.assertEqual(payload.documents[0].status, "Not Verified")

    def test_tender_response_preserves_v2_report_fields(self) -> None:
        tender = TenderResponse(
            id=uuid4(),
            title="Tender",
            analysis_json={
                "schemaVersion": "2.0",
                "analysisSummary": {"executiveSummary": "Apply after verification"},
                "readiness": {"documentsScore": 70},
            },
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.assertEqual(tender.analysis_json.analysisSummary.executiveSummary, "Apply after verification")
        self.assertEqual(tender.analysis_json.readiness.documentsScore, 70)


if __name__ == "__main__":
    unittest.main()
