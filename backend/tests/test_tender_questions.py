import json
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.schemas.analysis import TenderAnalysisPayload
from app.schemas.questions import TenderQuestionRequest
from app.services.model_provider import (
    ModelGenerationResult,
    ProviderUnavailable,
)
from app.services.rate_limit_service import (
    InMemoryRateLimitStore,
    RateLimitExceededError,
    RateLimitRule,
    RateLimitService,
)
from app.services.tender_question_service import (
    TenderQuestionNotFoundError,
    TenderQuestionNotReadyError,
    TenderQuestionService,
    TenderQuestionUnavailableError,
)
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
        return [
            row
            for row in self.rows
            if row["tender_id"] == tender_id
            and row["user_id"] == user_id
            and row["conversation_id"] == conversation_id
        ]

    def list_history(self, tender_id, user_id):
        return [
            row
            for row in self.rows
            if row["tender_id"] == tender_id and row["user_id"] == user_id
        ]

    def count_billable_questions(self, _user_id, _since):
        return self.count

    def create_exchange(self, **values):
        now = datetime.now(timezone.utc)
        common = {
            "conversation_id": values["conversation_id"],
            "user_id": values["user_id"],
            "tender_id": values["tender_id"],
            "language": values["language"],
            "scope_status": values["scope_status"],
            "created_at": now,
        }
        user = {
            **common,
            "id": uuid4(),
            "role": "user",
            "content": values["question"],
            "confidence": None,
            "citations": [],
            "not_found": False,
        }
        assistant = {
            **common,
            "id": uuid4(),
            "role": "assistant",
            "content": values["answer"],
            "confidence": values["confidence"],
            "citations": values["citations"],
            "not_found": values["not_found"],
        }
        self.rows.extend([user, assistant])
        return [user, assistant]

    def delete_history(self, tender_id, user_id):
        self.rows = [
            row
            for row in self.rows
            if not (row["tender_id"] == tender_id and row["user_id"] == user_id)
        ]


class FakeRetriever:
    def retrieve(self, *_args, **_kwargs):
        return [
            RetrievedTenderChunk(
                page=4,
                text="GST registration and PAN card must be uploaded with the bid.",
                score=9,
                extraction_method="text",
            )
        ]


class FakeModelRepository:
    def __init__(self):
        self.runs = []

    def record_model_run(self, values):
        self.runs.append(values)
        return values


class ProviderSpy:
    def __init__(self, name="gemini", outputs=None, citation=True):
        self.name = name
        self.calls = 0
        if outputs is None:
            citations = (
                [
                    {
                        "page": 4,
                        "clause": "6.1",
                        "title": "Documents required",
                        "quote": "GST registration and PAN card must be uploaded",
                        "confidence": 0.9,
                    }
                ]
                if citation
                else []
            )
            outputs = [
                json.dumps(
                    {
                        "answer": "Upload GST registration and PAN card.",
                        "confidence": 0.88,
                        "not_found": False,
                        "citations": citations,
                    }
                )
            ]
        self.outputs = list(outputs)

    def answer_question(self, _request):
        self.calls += 1
        output = self.outputs.pop(0)
        if isinstance(output, Exception):
            raise output
        return ModelGenerationResult(
            raw_text=output,
            parsed_json=None,
            provider=self.name,
            model_name=f"{self.name}-assistant",
            latency_ms=12,
            input_tokens=20,
            output_tokens=10,
        )

    def analyze_tender(self, request):
        return self.answer_question(request)

    def healthcheck(self):
        raise NotImplementedError


def ready_tender(**overrides):
    values = dict(
        document_type="tender",
        document_validation_status="valid",
        extracted_text_preview="Tender text",
        page_count=4,
        status="analyzed",
        analysis_json=TenderAnalysisPayload(schemaVersion="2.0"),
    )
    values.update(overrides)
    return SimpleNamespace(**values)


def settings(**overrides):
    values = dict(
        max_tender_questions_per_day=100,
        ai_provider="gemini",
        ai_fallback_provider="gemini",
        ai_shadow_provider="",
        ai_shadow_sample_rate=0,
        ai_shadow_user_allowlist=frozenset(),
    )
    values.update(overrides)
    return SimpleNamespace(**values)


def service(
    tender=None,
    providers=None,
    questions=None,
    owner=None,
    service_settings=None,
    runs=None,
):
    providers = providers or {"gemini": ProviderSpy()}
    runs = runs or FakeModelRepository()
    return TenderQuestionService(
        tender_repository=FakeTenderRepository(tender or ready_tender(), owner),
        question_repository=questions or FakeQuestionRepository(),
        retriever=FakeRetriever(),
        providers=providers,
        model_repository=runs,
        settings=service_settings or settings(),
    )


class TenderQuestionTests(unittest.TestCase):
    def test_user_cannot_question_another_users_tender(self):
        owner = uuid4()
        with self.assertRaises(TenderQuestionNotFoundError):
            service(owner=owner).ask(
                uuid4(), uuid4(), "What is the EMD?", "en", None
            )

    def test_rejected_scope_causes_no_model_call(self):
        user_id = uuid4()
        provider, shadow = ProviderSpy(), ProviderSpy("openai_compatible")
        result = service(
            providers={"gemini": provider, "openai_compatible": shadow},
            service_settings=settings(
                ai_shadow_provider="openai_compatible",
                ai_shadow_sample_rate=1,
                ai_shadow_user_allowlist=frozenset({user_id}),
            ),
        ).ask(
            uuid4(), user_id, "Write Python code", "en", None
        )
        self.assertEqual(result.scope_status, "rejected")
        self.assertEqual(provider.calls, 0)
        self.assertEqual(shadow.calls, 0)

    def test_non_tender_and_missing_extraction_are_blocked(self):
        with self.assertRaises(TenderQuestionNotReadyError):
            service(
                ready_tender(
                    document_type="non_tender",
                    document_validation_status="invalid",
                )
            ).ask(uuid4(), uuid4(), "EMD?", "en", None)
        with self.assertRaises(TenderQuestionNotReadyError):
            service(ready_tender(extracted_text_preview=None, page_count=None)).ask(
                uuid4(), uuid4(), "EMD?", "en", None
            )

    def test_valid_citation_is_returned_and_run_recorded(self):
        runs = FakeModelRepository()
        result = service(runs=runs).ask(
            uuid4(), uuid4(), "Which documents are mandatory?", "en", None
        )
        self.assertFalse(result.not_found)
        self.assertEqual(result.citations[0].page, 4)
        self.assertEqual(runs.runs[0]["task"], "tender_question")

    def test_unsupported_answer_becomes_not_found(self):
        result = service(
            providers={"gemini": ProviderSpy(citation=False)}
        ).ask(uuid4(), uuid4(), "What is the EMD?", "en", None)
        self.assertTrue(result.not_found)
        self.assertEqual(result.answer, "Not found in this tender.")

    def test_assistant_fallback_validates_citations_and_stores_one_message(self):
        primary = ProviderSpy("gemini", citation=False)
        fallback = ProviderSpy("openai_compatible")
        questions = FakeQuestionRepository()
        active = service(
            providers={"gemini": primary, "openai_compatible": fallback},
            questions=questions,
            service_settings=settings(ai_fallback_provider="openai_compatible"),
        )
        result = active.ask(
            uuid4(), uuid4(), "Which documents are mandatory?", "en", None
        )
        self.assertFalse(result.not_found)
        self.assertEqual(primary.calls, 1)
        self.assertEqual(fallback.calls, 1)
        self.assertEqual(
            len([row for row in questions.rows if row["role"] == "assistant"]), 1
        )

    def test_primary_and_fallback_failure_store_no_messages(self):
        questions = FakeQuestionRepository()
        active = service(
            providers={
                "gemini": ProviderSpy(
                    "gemini", outputs=[ProviderUnavailable("primary down")]
                ),
                "openai_compatible": ProviderSpy(
                    "openai_compatible", outputs=[ProviderUnavailable("fallback down")]
                ),
            },
            questions=questions,
            service_settings=settings(ai_fallback_provider="openai_compatible"),
        )
        with self.assertRaises(TenderQuestionUnavailableError):
            active.ask(uuid4(), uuid4(), "What is the EMD?", "en", None)
        self.assertEqual(questions.rows, [])

    def test_allowlisted_shadow_runs_without_duplicate_messages(self):
        user_id = uuid4()
        primary, shadow = ProviderSpy(), ProviderSpy("openai_compatible")
        questions, runs = FakeQuestionRepository(), FakeModelRepository()
        active = service(
            providers={"gemini": primary, "openai_compatible": shadow},
            questions=questions,
            runs=runs,
            service_settings=settings(
                ai_shadow_provider="openai_compatible",
                ai_shadow_sample_rate=1,
                ai_shadow_user_allowlist=frozenset({user_id}),
            ),
        )
        active.ask(uuid4(), user_id, "What is the EMD?", "en", None)
        self.assertEqual(shadow.calls, 1)
        self.assertEqual([run["is_shadow"] for run in runs.runs], [False, True])
        self.assertEqual(
            len([row for row in questions.rows if row["role"] == "assistant"]), 1
        )

    def test_non_allowlisted_user_skips_shadow(self):
        shadow = ProviderSpy("openai_compatible")
        active = service(
            providers={"gemini": ProviderSpy(), "openai_compatible": shadow},
            service_settings=settings(
                ai_shadow_provider="openai_compatible",
                ai_shadow_sample_rate=1,
                ai_shadow_user_allowlist=frozenset({uuid4()}),
            ),
        )
        active.ask(uuid4(), uuid4(), "What is the EMD?", "en", None)
        self.assertEqual(shadow.calls, 0)

    def test_shadow_failure_does_not_break_primary_or_duplicate_messages(self):
        user_id = uuid4()
        shadow = ProviderSpy(
            "openai_compatible", outputs=[ProviderUnavailable("shadow down")]
        )
        questions, runs = FakeQuestionRepository(), FakeModelRepository()
        active = service(
            providers={"gemini": ProviderSpy(), "openai_compatible": shadow},
            questions=questions,
            runs=runs,
            service_settings=settings(
                ai_shadow_provider="openai_compatible",
                ai_shadow_sample_rate=1,
                ai_shadow_user_allowlist=frozenset({user_id}),
            ),
        )
        result = active.ask(uuid4(), user_id, "What is the EMD?", "en", None)
        self.assertFalse(result.not_found)
        self.assertEqual(runs.runs[-1]["status"], "error")
        self.assertTrue(runs.runs[-1]["is_shadow"])
        self.assertEqual(
            len([row for row in questions.rows if row["role"] == "assistant"]), 1
        )

    def test_history_is_user_and_tender_scoped(self):
        repository = FakeQuestionRepository()
        tender_id, user_id = uuid4(), uuid4()
        active = service(questions=repository)
        active.ask(tender_id, user_id, "What is the EMD?", "en", None)
        self.assertEqual(len(active.history(tender_id, user_id).messages), 2)
        self.assertEqual(len(active.history(uuid4(), user_id).messages), 0)

    def test_language_validation_rejects_unknown_language(self):
        with self.assertRaises(Exception):
            TenderQuestionRequest(question="EMD?", language="fr")

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
                return [
                    {"page_number": 1, "text": "General notice"},
                    {"page_number": 4, "text": "EMD bid security is INR 20,000"},
                ]

        pages = Pages()
        tender_id, user_id = uuid4(), uuid4()
        results = TenderRetriever(pages).retrieve(
            tender_id, user_id, "What is the EMD?"
        )
        self.assertEqual(pages.scope, (tender_id, user_id))
        self.assertEqual(results[0].page, 4)


if __name__ == "__main__":
    unittest.main()
