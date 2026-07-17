from __future__ import annotations

from uuid import UUID

from app.repositories.ai_model_repository import AIModelRepository
from app.repositories.tender_repository import TenderRepository
from app.schemas.ai_feedback import AIOutputFeedbackCreate, AIOutputFeedbackResponse


class FeedbackTenderNotFoundError(ValueError):
    pass


class AIOutputFeedbackService:
    def __init__(
        self,
        tender_repository: TenderRepository | None = None,
        model_repository: AIModelRepository | None = None,
    ) -> None:
        self._tender_repository = tender_repository or TenderRepository()
        self._model_repository = model_repository or AIModelRepository()

    def record_field_feedback(
        self,
        *,
        tender_id: UUID,
        user_id: UUID,
        feedback: AIOutputFeedbackCreate,
    ) -> AIOutputFeedbackResponse:
        tender = self._tender_repository.get_tender_by_id(
            tender_id=tender_id,
            user_id=user_id,
        )
        if tender is None:
            raise FeedbackTenderNotFoundError(
                f"Tender {tender_id} was not found or does not belong to the current user."
            )
        if feedback.model_run_id is not None and not self._model_repository.model_run_belongs_to_tender(
            model_run_id=feedback.model_run_id,
            tender_id=tender_id,
            user_id=user_id,
        ):
            raise FeedbackTenderNotFoundError(
                "The model run was not found for this tender and user."
            )
        row = self._model_repository.create_feedback(
            user_id=user_id,
            tender_id=tender_id,
            model_run_id=feedback.model_run_id,
            field_path=feedback.field_path,
            feedback_type=feedback.feedback_type,
            original_value=feedback.original_value,
            corrected_value=feedback.corrected_value,
            source_page=feedback.source_page,
            source_quote=feedback.source_quote,
        )
        return AIOutputFeedbackResponse(**row)


_feedback_service: AIOutputFeedbackService | None = None


def get_ai_output_feedback_service() -> AIOutputFeedbackService:
    global _feedback_service
    if _feedback_service is None:
        _feedback_service = AIOutputFeedbackService()
    return _feedback_service
