import unittest

from app.services.document_validation_service import DocumentValidationService


class DocumentValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = DocumentValidationService()

    def test_classifies_tender_from_multiple_signals(self) -> None:
        result = self.service.classify("Notice Inviting Tender. Bid submission deadline. EMD and bidder eligibility criteria apply.")
        self.assertEqual(result.document_type, "tender")
        self.assertEqual(result.status, "valid")

    def test_classifies_resume_as_non_tender(self) -> None:
        result = self.service.classify("Curriculum Vitae. Career objective, education and work experience.")
        self.assertEqual(result.document_type, "non_tender")
        self.assertEqual(result.status, "invalid")

    def test_classifies_weak_evidence_as_uncertain(self) -> None:
        result = self.service.classify("A quotation document for office chairs.")
        self.assertEqual(result.document_type, "uncertain")
        self.assertEqual(result.status, "review")


if __name__ == "__main__":
    unittest.main()
