import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.schemas.analysis import TenderAnalysisPayload
from app.services.citation_validation_service import CitationValidationService
from app.services.rate_limit_service import InMemoryRateLimitStore, RateLimitExceededError, RateLimitRule, RateLimitService
from app.services.tender_question_provider import ProviderAnswer, ProviderCitation, TenderQuestionProvider
from app.services.tender_question_service import TenderQuestionNotFoundError, TenderQuestionNotReadyError, TenderQuestionService
from app.services.tender_retriever import RetrievedTenderChunk, TenderRetriever
from app.services.tender_scope_classifier import TenderScopeClassifier


class FakeTenderRepository:
    def __init__(self, tender, owner=None):
        self.tender = tender
        self.owner = owner

    def get_tender_by_id(self, _tender_id, user_id=None):
        return self.tender if self.owner is None or self.owner == user_id else None


class FakeQuestionRepository:
    def __init__(self, count=0):
        self.rows = []
        self.count = count

    def list_conversation(self, tender_id, user_id, conversation_id):
        return [row for row in self.rows if row["tender_id"] == tender_id and row["user_id"] == user_id and row["conversation_id"] == conversation_id]

    def list_history(self, tender_id, user_id):
        return [row for row in self.rows if row["tender_id"] == tender_id and row["user_id"] == user_id]

    def count_billable_questions(self, _user_id, _since):
        return self.count

    def create_exchange(self, **values):
        now = datetime.now(timezone.utc)
        common = {"conversation_id": values["conversation_id"], "user_id": values["user_id"], "tender_id": values["tender_id"], "language": values["language"], "scope_status": values["scope_status"], "created_at": now}
        user = {**common, "id": uuid4(), "role": "user", "content": values["question"], "confidence": None, "citations": [], "not_found": False}
        assistant = {**common, "id": uuid4(), "role": "assistant", "content": values["answer"], "confidence": values["confidence"], "citations": values["citations"], "not_found": values["not_found"]}
        self.rows.extend([user, assistant])
        return [user, assistant]

    def delete_history(self, tender_id, user_id):
        self.rows = [row for row in self.rows if not (row["tender_id"] == tender_id and row["user_id"] == user_id)]


class FakeRetriever:
    def retrieve(self, *_args, **_kwargs):
        return [RetrievedTenderChunk(page=4, text="GST registration and PAN card must be uploaded with the bid.", score=9, extraction_method="text")]


class ProviderSpy(TenderQuestionProvider):
    provider_name = "fake"
    model_name = "fake-grounded"

    def __init__(self, citation=True):
        self.answer_calls = 0
        self.classify_calls = 0
        self.citation = citation

    def classify_scope(self, _question, _language):
        self.classify_calls += 1
        return "accepted"

    def answer_question(self, **_kwargs):
        self.answer_calls += 1
        citations = [ProviderCitation(4, "6.1", "Documents required", "GST registration and PAN card must be uploaded", .9)] if self.citation else []
        return ProviderAnswer("Upload GST registration and PAN card.", .88, citations)


def ready_tender(**overrides):
    values = dict(document_type="tender", document_validation_status="valid", extracted_text_preview="Tender text", page_count=4, status="analyzed", analysis_json=TenderAnalysisPayload(schemaVersion="2.0"))
    values.update(overrides)
    return SimpleNamespace(**values)


def service(tender=None, provider=None, questions=None, owner=None):
    return TenderQuestionService(tender_repository=FakeTenderRepository(tender or ready_tender(), owner), question_repository=questions or FakeQuestionRepository(), retriever=FakeRetriever(), provider=provider or ProviderSpy(), settings=SimpleNamespace(max_tender_questions_per_day=100))


class TenderQuestionTests(unittest.TestCase):
    def test_user_cannot_question_another_users_tender(self):
        owner = uuid4()
        with self.assertRaises(TenderQuestionNotFoundError):
            service(owner=owner).ask(uuid4(), uuid4(), "What is the EMD?", "en", None)

    def test_unrelated_question_does_not_call_provider(self):
        provider = ProviderSpy()
        result = service(provider=provider).ask(uuid4(), uuid4(), "Write Python code", "en", None)
        self.assertEqual(result.scope_status, "rejected")
        self.assertEqual(provider.answer_calls, 0)
        self.assertEqual(provider.classify_calls, 0)

    def test_non_tender_and_missing_extraction_are_blocked(self):
        with self.assertRaises(TenderQuestionNotReadyError):
            service(ready_tender(document_type="non_tender", document_validation_status="invalid")).ask(uuid4(), uuid4(), "EMD?", "en", None)
        with self.assertRaises(TenderQuestionNotReadyError):
            service(ready_tender(extracted_text_preview=None, page_count=None)).ask(uuid4(), uuid4(), "EMD?", "en", None)

    def test_valid_citation_is_returned(self):
        result = service().ask(uuid4(), uuid4(), "Which documents are mandatory?", "en", None)
        self.assertFalse(result.not_found)
        self.assertEqual(result.citations[0].page, 4)

    def test_unsupported_answer_becomes_not_found(self):
        result = service(provider=ProviderSpy(citation=False)).ask(uuid4(), uuid4(), "What is the EMD?", "en", None)
        self.assertTrue(result.not_found)
        self.assertEqual(result.answer, "Not found in this tender.")

    def test_history_is_user_and_tender_scoped(self):
        repository = FakeQuestionRepository()
        tender_id, user_id = uuid4(), uuid4()
        active = service(questions=repository)
        active.ask(tender_id, user_id, "What is the EMD?", "en", None)
        self.assertEqual(len(active.history(tender_id, user_id).messages), 2)
        self.assertEqual(len(active.history(uuid4(), user_id).messages), 0)

    def test_language_validation_rejects_unknown_language(self):
        from app.schemas.questions import TenderQuestionRequest
        with self.assertRaises(Exception):
            TenderQuestionRequest(question="EMD?", language="fr")

    def test_invalid_citation_is_removed(self):
        citation = ProviderCitation(4, "6.1", "Documents", "A quote that does not exist", .9)
        chunks = [RetrievedTenderChunk(4, "GST registration is required.", 1)]
        self.assertEqual(CitationValidationService().validate([citation], chunks), [])

    def test_scope_classifier_handles_accept_reject_and_uncertain(self):
        classifier = TenderScopeClassifier()
        self.assertEqual(classifier.classify("What is the EMD?"), "accepted")
        self.assertEqual(classifier.classify("Tell me a joke"), "rejected")
        self.assertEqual(classifier.classify("Can this work for us?"), "uncertain")

    def test_rate_limit_store_rejects_eleventh_request(self):
        limiter = RateLimitService(InMemoryRateLimitStore())
        rule = RateLimitRule("questions", 10, 60)
        for _ in range(10):
            limiter.check("user", rule)
        with self.assertRaises(RateLimitExceededError):
            limiter.check("user", rule)


class RetrieverTests(unittest.TestCase):
    def test_relevant_page_retrieval_stays_in_repository_scope(self):
        class Pages:
            def list_tender_pages(self, tender_id, user_id):
                self.scope = (tender_id, user_id)
                return [{"page_number": 1, "text": "General notice"}, {"page_number": 4, "text": "EMD bid security is INR 20,000"}]
        pages = Pages()
        tender_id, user_id = uuid4(), uuid4()
        results = TenderRetriever(pages).retrieve(tender_id, user_id, "What is the EMD?")
        self.assertEqual(pages.scope, (tender_id, user_id))
        self.assertEqual(results[0].page, 4)


if __name__ == "__main__":
    unittest.main()
