import unittest
from uuid import uuid4

from pydantic import ValidationError

from app.schemas.launch import ProductFeedbackCreate
from app.services.launch_service import FeedbackOwnershipError, LaunchService


class FakeLaunchRepository:
    def __init__(self):
        self.acceptances = []
        self.feedback = []

    def list_acceptances(self, user_id, version):
        return [item for item in self.acceptances if item["user_id"] == str(user_id) and item["document_version"] == version]

    def record_acceptances(self, user_id, locale, version):
        self.acceptances = [{"user_id": str(user_id), "document_type": item, "document_version": version, "locale": locale} for item in ("terms", "privacy", "ai_disclaimer")]
        return self.acceptances

    def create_feedback(self, values):
        row = {"id": str(uuid4()), "status": "new", "created_at": "2026-07-18T00:00:00Z", **values}
        self.feedback.append(row)
        return row


class FakeTenderRepository:
    def __init__(self, owned=True):
        self.owned = owned

    def get_tender_by_id(self, tender_id, user_id):
        return object() if self.owned else None


def feedback(**overrides):
    values = {"category": "design", "message": "The mobile spacing needs review.", "locale": "en", "page_path": "/demo", "performance_mode": "full", "viewport_class": "mobile"}
    values.update(overrides)
    return ProductFeedbackCreate(**values)


class LaunchFoundationTests(unittest.TestCase):
    def test_legal_acceptance_records_current_version_once_per_document(self):
        repository = FakeLaunchRepository()
        service = LaunchService(repository=repository, tender_repository=FakeTenderRepository())
        user_id = uuid4()
        self.assertTrue(service.acceptance_status(user_id).required)
        status = service.accept_current_documents(user_id, "hi", True)
        self.assertFalse(status.required)
        self.assertEqual(set(status.accepted_documents), {"terms", "privacy", "ai_disclaimer"})

    def test_feedback_validation_excludes_sensitive_fields(self):
        with self.assertRaises(ValidationError):
            ProductFeedbackCreate(category="design", message="Valid feedback message", locale="en", page_path="/", performance_mode="full", viewport_class="mobile", access_token="secret")

    def test_tender_feedback_requires_ownership(self):
        service = LaunchService(repository=FakeLaunchRepository(), tender_repository=FakeTenderRepository(owned=False))
        with self.assertRaises(FeedbackOwnershipError):
            service.record_feedback(feedback(tender_id=uuid4()), uuid4())

    def test_anonymous_feedback_contains_no_user_identity(self):
        repository = FakeLaunchRepository()
        service = LaunchService(repository=repository, tender_repository=FakeTenderRepository())
        service.record_feedback(feedback(), None)
        self.assertIsNone(repository.feedback[0]["user_id"])
        self.assertNotIn("access_token", repository.feedback[0])


if __name__ == "__main__":
    unittest.main()
