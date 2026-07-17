from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from threading import Lock
from time import perf_counter
from typing import Any, Iterator
from uuid import UUID, uuid4

from app.core.config import Settings, get_settings
from app.repositories.tender_question_repository import TenderQuestionRepository
from app.repositories.tender_repository import TenderRepository
from app.schemas.questions import TenderChatMessage, TenderQuestionHistoryResponse, TenderQuestionResponse
from app.services.citation_validation_service import CitationValidationService
from app.services.gemini_tender_question_provider import GeminiTenderQuestionProvider, TenderQuestionProviderError
from app.services.tender_question_provider import TenderQuestionProvider
from app.services.tender_retriever import TenderRetriever
from app.services.tender_scope_classifier import NOT_FOUND, SCOPE_REJECTION, TenderScopeClassifier


class TenderQuestionError(RuntimeError):
    status_code = 400
    category = "invalid_request"


class TenderQuestionNotFoundError(TenderQuestionError):
    status_code = 404
    category = "tender_not_found"


class TenderQuestionNotReadyError(TenderQuestionError):
    status_code = 409
    category = "tender_not_ready"


class TenderQuestionRateLimitError(TenderQuestionError):
    status_code = 429
    category = "daily_limit"


class TenderQuestionBusyError(TenderQuestionError):
    status_code = 429
    category = "concurrent_request"


class TenderQuestionUnavailableError(TenderQuestionError):
    status_code = 503
    category = "assistant_unavailable"


class TenderQuestionService:
    _active: set[tuple[UUID, UUID]] = set()
    _active_lock = Lock()

    def __init__(
        self,
        *,
        tender_repository: TenderRepository | None = None,
        question_repository: TenderQuestionRepository | None = None,
        retriever: TenderRetriever | None = None,
        provider: TenderQuestionProvider | None = None,
        classifier: TenderScopeClassifier | None = None,
        citation_validator: CitationValidationService | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.tenders = tender_repository or TenderRepository()
        self.questions = question_repository or TenderQuestionRepository()
        self.retriever = retriever or TenderRetriever()
        self.provider = provider or GeminiTenderQuestionProvider()
        self.classifier = classifier or TenderScopeClassifier()
        self.citations = citation_validator or CitationValidationService()
        self.settings = settings or get_settings()
        self.last_audit_metadata: dict[str, Any] = {}

    def ask(self, tender_id: UUID, user_id: UUID, question: str, language: str, conversation_id: UUID | None) -> TenderQuestionResponse:
        started = perf_counter()
        tender = self._ready_tender(tender_id, user_id)
        conversation_id = conversation_id or uuid4()
        history = self.questions.list_conversation(tender_id, user_id, conversation_id)
        if history and any(str(item.get("user_id", user_id)) != str(user_id) for item in history):
            raise TenderQuestionNotFoundError("Conversation was not found.")

        scope = self.classifier.classify(question)
        if scope == "rejected":
            return self._store_response(tender_id, user_id, conversation_id, question, language, scope, SCOPE_REJECTION[language], None, [], False, started)

        with self._exclusive(user_id, tender_id):
            if self.questions.count_billable_questions(user_id, datetime.now(timezone.utc) - timedelta(days=1)) >= self.settings.max_tender_questions_per_day:
                raise TenderQuestionRateLimitError("Daily tender-question limit reached. Please try again tomorrow.")
            try:
                if scope == "uncertain":
                    scope = self.provider.classify_scope(question, language)
                    if scope != "accepted":
                        return self._store_response(tender_id, user_id, conversation_id, question, language, "rejected", SCOPE_REJECTION[language], None, [], False, started)

                analysis = tender.analysis_json.model_dump(mode="json") if tender.analysis_json else {}
                chunks = self.retriever.retrieve(tender_id, user_id, question, analysis_json=analysis, limit=8)
                if not chunks:
                    return self._store_response(tender_id, user_id, conversation_id, question, language, "accepted", NOT_FOUND[language], None, [], True, started)
                answer = self.provider.answer_question(question=question, language=language, chunks=chunks, analysis=analysis, history=history)
                valid = self.citations.validate(answer.citations, chunks)
                not_found = answer.not_found or not valid
                content = NOT_FOUND[language] if not_found else answer.answer
                if not content:
                    not_found = True
                    content = NOT_FOUND[language]
                self.last_audit_metadata.update({
                    "provider": self.provider.provider_name,
                    "model": self.provider.model_name,
                    "retrieved_pages": sorted({chunk.page for chunk in chunks}),
                    "citations_proposed": len(answer.citations),
                    "citations_valid": len(valid),
                    "input_tokens": answer.input_tokens,
                    "output_tokens": answer.output_tokens,
                })
                return self._store_response(tender_id, user_id, conversation_id, question, language, "accepted", content, answer.confidence, [item.model_dump(mode="json") for item in valid], not_found, started)
            except TenderQuestionProviderError as exc:
                raise TenderQuestionUnavailableError(str(exc)) from exc

    def history(self, tender_id: UUID, user_id: UUID) -> TenderQuestionHistoryResponse:
        self._ready_tender(tender_id, user_id)
        rows = self.questions.list_history(tender_id, user_id)
        return TenderQuestionHistoryResponse(tender_id=tender_id, messages=[TenderChatMessage.model_validate(row) for row in rows])

    def clear_history(self, tender_id: UUID, user_id: UUID) -> None:
        self._ready_tender(tender_id, user_id)
        self.questions.delete_history(tender_id, user_id)

    def _ready_tender(self, tender_id: UUID, user_id: UUID):
        tender = self.tenders.get_tender_by_id(tender_id, user_id=user_id)
        if tender is None:
            raise TenderQuestionNotFoundError("Tender was not found.")
        if tender.document_type == "non_tender" or tender.document_validation_status == "invalid":
            raise TenderQuestionNotReadyError("This file does not appear to be a tender.")
        if tender.document_type == "uncertain" or tender.document_validation_status == "review":
            raise TenderQuestionNotReadyError("Review this document before using Ask TenderMate.")
        if not tender.extracted_text_preview or tender.page_count is None:
            raise TenderQuestionNotReadyError("Extract the tender before asking questions.")
        if not tender.analysis_json or tender.status != "analyzed":
            raise TenderQuestionNotReadyError("Analyze the tender before asking questions.")
        return tender

    def _store_response(self, tender_id: UUID, user_id: UUID, conversation_id: UUID, question: str, language: str, scope: str, answer: str, confidence: float | None, citations: list[dict[str, Any]], not_found: bool, started: float) -> TenderQuestionResponse:
        rows = self.questions.create_exchange(tender_id=tender_id, user_id=user_id, conversation_id=conversation_id, question=question, answer=answer, language=language, scope_status=scope, confidence=confidence, citations=citations, not_found=not_found)
        assistant = next((row for row in reversed(rows) if row.get("role") == "assistant"), None)
        if not assistant:
            raise TenderQuestionUnavailableError("Tender assistant could not store its response.")
        self.last_audit_metadata.update({"scope_status": scope, "not_found": not_found, "latency_ms": round((perf_counter() - started) * 1000)})
        return TenderQuestionResponse(answer=answer, language=language, scope_status=scope, confidence=confidence, citations=citations, not_found=not_found, conversation_id=conversation_id, message_id=assistant["id"])

    @contextmanager
    def _exclusive(self, user_id: UUID, tender_id: UUID) -> Iterator[None]:
        key = (user_id, tender_id)
        with self._active_lock:
            if key in self._active:
                raise TenderQuestionBusyError("A question is already being answered for this tender.")
            self._active.add(key)
        try:
            yield
        finally:
            with self._active_lock:
                self._active.discard(key)


def get_tender_question_service() -> TenderQuestionService:
    return TenderQuestionService()
