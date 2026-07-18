from uuid import UUID

from app.repositories.launch_repository import LaunchRepository
from app.repositories.tender_repository import TenderRepository
from app.schemas.launch import LegalAcceptanceStatus, ProductFeedbackCreate, ProductFeedbackResponse

CURRENT_LEGAL_VERSION = "1.0"
LEGAL_DOCUMENTS = ("terms", "privacy", "ai_disclaimer")


class FeedbackOwnershipError(Exception):
    pass


class LaunchService:
    def __init__(self, repository: LaunchRepository | None = None, tender_repository: TenderRepository | None = None) -> None:
        self._repository = repository
        self._tender_repository = tender_repository

    @property
    def repository(self) -> LaunchRepository:
        if self._repository is None:
            self._repository = LaunchRepository()
        return self._repository

    @property
    def tender_repository(self) -> TenderRepository:
        if self._tender_repository is None:
            self._tender_repository = TenderRepository()
        return self._tender_repository

    def acceptance_status(self, user_id: UUID) -> LegalAcceptanceStatus:
        accepted = {row["document_type"] for row in self.repository.list_acceptances(user_id, CURRENT_LEGAL_VERSION)}
        missing = [item for item in LEGAL_DOCUMENTS if item not in accepted]
        return LegalAcceptanceStatus(required=bool(missing), accepted_documents=sorted(accepted), missing_documents=missing, version=CURRENT_LEGAL_VERSION)

    def accept_current_documents(self, user_id: UUID, locale: str, accepted: bool) -> LegalAcceptanceStatus:
        if not accepted:
            raise ValueError("Explicit legal acceptance is required.")
        self.repository.record_acceptances(user_id, locale, CURRENT_LEGAL_VERSION)
        return self.acceptance_status(user_id)

    def record_feedback(self, payload: ProductFeedbackCreate, user_id: UUID | None) -> ProductFeedbackResponse:
        if payload.tender_id is not None:
            if user_id is None or self.tender_repository.get_tender_by_id(payload.tender_id, user_id) is None:
                raise FeedbackOwnershipError("Tender feedback is not available for this account.")
        values = payload.model_dump(mode="json")
        values["user_id"] = str(user_id) if user_id else None
        values["tender_id"] = str(payload.tender_id) if payload.tender_id else None
        return ProductFeedbackResponse(**self.repository.create_feedback(values))


def get_launch_service() -> LaunchService:
    return LaunchService()
