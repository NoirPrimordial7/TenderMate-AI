from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.api.v1.routes.tenders import _etag
from app.repositories.tender_question_repository import TenderQuestionRepository
from app.services.tender_service import TenderService


class FakeTenderRepository:
    def __init__(self):
        self.kwargs = None

    def list_tenders(self, user_id=None, **kwargs):
        self.kwargs = {"user_id": user_id, **kwargs}
        return []


class Query:
    def __init__(self):
        self.filters = []

    def select(self, *_args, **_kwargs): return self
    def eq(self, key, value): self.filters.append(("eq", key, value)); return self
    def gt(self, key, value): self.filters.append(("gt", key, value)); return self
    def order(self, *_args, **_kwargs): return self
    def execute(self): return SimpleNamespace(data=[])


class Client:
    def __init__(self): self.query = Query()
    def table(self, _name): return self.query


def test_tender_service_passes_cursor_delta_and_limit_to_owned_repository():
    repository = FakeTenderRepository()
    service = TenderService(repository=repository)
    user_id = uuid4()
    cursor = datetime(2026, 7, 18, tzinfo=timezone.utc)
    updated_since = datetime(2026, 7, 17, tzinfo=timezone.utc)
    service.list_tenders(user_id, limit=40, cursor=cursor, updated_since=updated_since)
    assert repository.kwargs == {"user_id": user_id, "limit": 40, "cursor": cursor, "updated_since": updated_since}


def test_incremental_chat_history_remains_tender_and_user_scoped():
    client = Client()
    repository = TenderQuestionRepository(supabase_client=client)
    after = datetime(2026, 7, 18, tzinfo=timezone.utc)
    tender_id, user_id = uuid4(), uuid4()
    repository.list_history(tender_id, user_id, after=after)
    assert ("eq", "tender_id", str(tender_id)) in client.query.filters
    assert ("eq", "user_id", str(user_id)) in client.query.filters
    assert ("gt", "created_at", after.isoformat()) in client.query.filters


def test_etag_changes_when_resource_version_changes():
    first = _etag(["tender-1", "2026-07-18T00:00:00Z", "1.0"])
    second = _etag(["tender-1", "2026-07-18T00:00:01Z", "2.0"])
    assert first != second
    assert first.startswith('"') and first.endswith('"')
