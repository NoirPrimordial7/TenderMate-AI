from datetime import datetime
from uuid import UUID

from app.repositories.tender_repository import TenderRepository
from app.schemas.tender import TenderResponse


class TenderService:
    def __init__(self, repository: TenderRepository | None = None) -> None:
        self.repository = repository or TenderRepository()

    def list_tenders(self, user_id: UUID | None = None, *, limit: int | None = None, cursor: datetime | None = None, updated_since: datetime | None = None) -> list[TenderResponse]:
        return self.repository.list_tenders(user_id=user_id, limit=limit, cursor=cursor, updated_since=updated_since)

    def get_latest_tender(self, user_id: UUID | None = None) -> TenderResponse | None:
        return self.repository.get_latest_tender(user_id=user_id)

    def get_tender_by_id(
        self,
        tender_id: UUID,
        user_id: UUID | None = None,
    ) -> TenderResponse | None:
        return self.repository.get_tender_by_id(tender_id, user_id=user_id)


_tender_service = TenderService()


def get_tender_service() -> TenderService:
    return _tender_service
