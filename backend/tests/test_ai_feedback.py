import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.repositories.ai_model_repository import AIModelRepository
from app.schemas.ai_feedback import AIOutputFeedbackCreate
from app.services.ai_feedback_service import (
    AIOutputFeedbackService,
    FeedbackTenderNotFoundError,
)


class FakeTenderRepository:
    def __init__(self, owned):
        self.owned = owned

    def get_tender_by_id(self, tender_id, user_id):
        return SimpleNamespace(id=tender_id) if self.owned else None


class FakeModelRepository:
    def model_run_belongs_to_tender(self, **_values):
        return True

    def create_feedback(self, **values):
        return {
            "id": str(uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            **{key: str(value) if key in {"user_id", "tender_id", "model_run_id"} and value else value for key, value in values.items()},
        }


class AIFeedbackTests(unittest.TestCase):
    def test_feedback_requires_tender_ownership(self) -> None:
        service = AIOutputFeedbackService(
            tender_repository=FakeTenderRepository(owned=False),
            model_repository=FakeModelRepository(),
        )
        with self.assertRaises(FeedbackTenderNotFoundError):
            service.record_field_feedback(
                tender_id=uuid4(),
                user_id=uuid4(),
                feedback=AIOutputFeedbackCreate(
                    field_path="decision.riskLevel",
                    feedback_type="incorrect",
                ),
            )

    def test_owned_feedback_is_recorded(self) -> None:
        service = AIOutputFeedbackService(
            tender_repository=FakeTenderRepository(owned=True),
            model_repository=FakeModelRepository(),
        )
        response = service.record_field_feedback(
            tender_id=uuid4(),
            user_id=uuid4(),
            feedback=AIOutputFeedbackCreate(
                field_path="decision.riskLevel",
                feedback_type="wrong_source",
                source_page=2,
            ),
        )
        self.assertEqual(response.feedback_type, "wrong_source")

    def test_feedback_rejects_unowned_model_run(self) -> None:
        repository = FakeModelRepository()
        repository.model_run_belongs_to_tender = lambda **_values: False
        service = AIOutputFeedbackService(
            tender_repository=FakeTenderRepository(owned=True),
            model_repository=repository,
        )
        with self.assertRaises(FeedbackTenderNotFoundError):
            service.record_field_feedback(
                tender_id=uuid4(),
                user_id=uuid4(),
                feedback=AIOutputFeedbackCreate(
                    model_run_id=uuid4(),
                    field_path="decision.riskLevel",
                    feedback_type="incorrect",
                ),
            )

    def test_training_example_write_is_admin_only(self) -> None:
        repository = AIModelRepository(supabase_client=None)
        with self.assertRaises(PermissionError):
            repository.create_training_example({}, is_admin=False)

    def test_training_dataset_export_is_admin_only(self) -> None:
        repository = AIModelRepository(supabase_client=None)
        with self.assertRaises(PermissionError):
            repository.list_training_examples_for_export(is_admin=False)


if __name__ == "__main__":
    unittest.main()
