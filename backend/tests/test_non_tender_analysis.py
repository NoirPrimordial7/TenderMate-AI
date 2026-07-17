import unittest
from types import SimpleNamespace
from uuid import uuid4

from app.services.gemini_analysis_service import GeminiAnalysisService, NonTenderDocumentError


class FakeTenderRepository:
    def get_tender_by_id(self, tender_id, user_id):
        return SimpleNamespace(document_type="non_tender", document_validation_status="invalid", document_validation_reason="Resume indicators found.", status="extracted")


class NeverCalledRepository:
    def list_tender_pages(self, tender_id, user_id):
        raise AssertionError("Pages must not be loaded for a rejected non-tender")


class UsageSpy:
    def __init__(self):
        self.credit_checked = False
        self.credit_consumed = False

    def can_run_ai_analysis(self, user_id):
        self.credit_checked = True
        return True

    def consume_analysis_credit(self, user_id, tender_id):
        self.credit_consumed = True


class NonTenderAnalysisTests(unittest.TestCase):
    def test_rejection_happens_before_credit_or_model_work(self) -> None:
        usage = UsageSpy()
        service = GeminiAnalysisService(tender_repository=FakeTenderRepository(), analysis_repository=NeverCalledRepository(), settings=SimpleNamespace(gemini_api_key="configured"))
        with self.assertRaises(NonTenderDocumentError):
            service.analyze_tender(uuid4(), uuid4(), usage)
        self.assertFalse(usage.credit_checked)
        self.assertFalse(usage.credit_consumed)


if __name__ == "__main__":
    unittest.main()
