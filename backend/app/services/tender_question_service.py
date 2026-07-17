from __future__ import annotations

import json
import re
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from threading import Lock
from time import perf_counter
from typing import Any, Iterator
from uuid import UUID, uuid4

from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.repositories.ai_model_repository import AIModelRepository
from app.repositories.tender_question_repository import TenderQuestionRepository
from app.repositories.tender_repository import TenderRepository
from app.schemas.questions import (
    QuestionCitation,
    TenderChatMessage,
    TenderQuestionHistoryResponse,
    TenderQuestionModelOutput,
    TenderQuestionResponse,
)
from app.services.citation_validation_service import CitationValidationService
from app.services.model_generation_router import (
    ModelGenerationRouter,
    ModelRoutingFailed,
    ValidatedModelOutput,
)
from app.services.model_provider import (
    InvalidModelOutput,
    ModelGenerationResult,
    SchemaValidationFailed,
    TenderModelProvider,
    TenderQuestionContextChunk,
    TenderQuestionGenerationRequest,
)
from app.services.tender_retriever import RetrievedTenderChunk, TenderRetriever
from app.services.tender_scope_classifier import (
    NOT_FOUND,
    SCOPE_REJECTION,
    TenderScopeClassifier,
)

PROMPT_VERSION = "tender-question-1.0"
SCHEMA_VERSION = "1.0"
_JSON_FENCE = re.compile(
    r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL | re.IGNORECASE
)


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


@dataclass(frozen=True)
class GroundedQuestionAnswer:
    answer: str
    confidence: float | None
    citations: list[QuestionCitation]
    not_found: bool


class TenderQuestionService:
    _active: set[tuple[UUID, UUID]] = set()
    _active_lock = Lock()

    def __init__(
        self,
        *,
        tender_repository: TenderRepository | None = None,
        question_repository: TenderQuestionRepository | None = None,
        retriever: TenderRetriever | None = None,
        classifier: TenderScopeClassifier | None = None,
        citation_validator: CitationValidationService | None = None,
        settings: Settings | None = None,
        model_repository: AIModelRepository | None = None,
        providers: dict[str, TenderModelProvider] | None = None,
        model_router: ModelGenerationRouter | None = None,
    ) -> None:
        self.tenders = tender_repository or TenderRepository()
        self.questions = question_repository or TenderQuestionRepository()
        self.retriever = retriever or TenderRetriever()
        self.classifier = classifier or TenderScopeClassifier()
        self.citations = citation_validator or CitationValidationService()
        self.settings = settings or get_settings()
        self._model_repository = model_repository or AIModelRepository()
        self._providers = providers
        self._model_router = model_router
        self.last_audit_metadata: dict[str, Any] = {}

    def ask(
        self,
        tender_id: UUID,
        user_id: UUID,
        question: str,
        language: str,
        conversation_id: UUID | None,
    ) -> TenderQuestionResponse:
        started = perf_counter()
        tender = self._ready_tender(tender_id, user_id)
        conversation_id = conversation_id or uuid4()
        history = self.questions.list_conversation(
            tender_id, user_id, conversation_id
        )
        if history and any(
            str(item.get("user_id", user_id)) != str(user_id) for item in history
        ):
            raise TenderQuestionNotFoundError("Conversation was not found.")

        scope = self.classifier.classify(question)
        if scope != "accepted":
            return self._store_response(
                tender_id,
                user_id,
                conversation_id,
                question,
                language,
                "rejected",
                SCOPE_REJECTION[language],
                None,
                [],
                False,
                started,
            )

        with self._exclusive(user_id, tender_id):
            since = datetime.now(timezone.utc) - timedelta(days=1)
            if (
                self.questions.count_billable_questions(user_id, since)
                >= self.settings.max_tender_questions_per_day
            ):
                raise TenderQuestionRateLimitError(
                    "Daily tender-question limit reached. Please try again tomorrow."
                )
            analysis = (
                tender.analysis_json.model_dump(mode="json")
                if tender.analysis_json
                else {}
            )
            chunks = self.retriever.retrieve(
                tender_id,
                user_id,
                question,
                analysis_json=analysis,
                limit=8,
            )
            if not chunks:
                return self._store_not_found(
                    tender_id,
                    user_id,
                    conversation_id,
                    question,
                    language,
                    started,
                )

            request = self._generation_request(
                question=question,
                language=language,
                chunks=chunks,
                analysis=analysis,
                history=history,
            )
            input_hash = self._input_hash(request)
            try:
                routed = self._router().generate(
                    task="tender_question",
                    request=request,
                    invoke=lambda provider, value: provider.answer_question(value),
                    validate=lambda provider, result: self._validate_answer(
                        result, chunks, language
                    ),
                    user_id=user_id,
                    tender_id=tender_id,
                    input_hash=input_hash,
                    prompt_version=PROMPT_VERSION,
                    schema_version=SCHEMA_VERSION,
                )
            except ModelRoutingFailed as exc:
                if exc.all_validation_failed:
                    self.last_audit_metadata["validation_passed"] = False
                    return self._store_not_found(
                        tender_id,
                        user_id,
                        conversation_id,
                        question,
                        language,
                        started,
                    )
                raise TenderQuestionUnavailableError(
                    "Tender assistant is temporarily unavailable."
                ) from exc

            answer = routed.value
            self.last_audit_metadata.update(
                {
                    "provider": routed.result.provider,
                    "model": routed.result.model_name,
                    "retrieved_pages": sorted({chunk.page for chunk in chunks}),
                    "citations_valid": len(answer.citations),
                    "input_tokens": routed.result.input_tokens,
                    "output_tokens": routed.result.output_tokens,
                    "validation_passed": True,
                }
            )
            return self._store_response(
                tender_id,
                user_id,
                conversation_id,
                question,
                language,
                "accepted",
                answer.answer,
                answer.confidence,
                [citation.model_dump(mode="json") for citation in answer.citations],
                answer.not_found,
                started,
            )

    def _validate_answer(
        self,
        result: ModelGenerationResult,
        chunks: list[RetrievedTenderChunk],
        language: str,
    ) -> ValidatedModelOutput[GroundedQuestionAnswer]:
        candidate = result.raw_text.strip()
        match = _JSON_FENCE.fullmatch(candidate)
        if match:
            candidate = match.group(1).strip()
        try:
            payload = json.loads(candidate)
        except (json.JSONDecodeError, TypeError) as exc:
            raise InvalidModelOutput(
                "The model returned invalid assistant JSON."
            ) from exc
        if not isinstance(payload, dict):
            raise InvalidModelOutput("The assistant response must be a JSON object.")
        try:
            output = TenderQuestionModelOutput.model_validate(payload)
        except ValidationError as exc:
            raise SchemaValidationFailed(
                "The assistant response did not match its schema."
            ) from exc
        if output.not_found:
            return ValidatedModelOutput(
                value=GroundedQuestionAnswer(
                    answer=NOT_FOUND[language],
                    confidence=output.confidence,
                    citations=[],
                    not_found=True,
                )
            )
        valid_citations = self.citations.validate(output.citations, chunks)
        if not output.answer.strip() or not valid_citations:
            raise SchemaValidationFailed(
                "The assistant answer was not supported by valid citations."
            )
        return ValidatedModelOutput(
            value=GroundedQuestionAnswer(
                answer=output.answer.strip(),
                confidence=output.confidence,
                citations=valid_citations,
                not_found=False,
            )
        )

    def _generation_request(
        self,
        *,
        question: str,
        language: str,
        chunks: list[RetrievedTenderChunk],
        analysis: dict[str, Any],
        history: list[dict[str, Any]],
    ) -> TenderQuestionGenerationRequest:
        bounded_history = tuple(
            {
                "role": str(item.get("role") or "user")[:20],
                "content": str(item.get("content") or "")[:500],
            }
            for item in history[-6:]
        )
        return TenderQuestionGenerationRequest(
            question=question,
            language=language,
            chunks=tuple(
                TenderQuestionContextChunk(
                    page=chunk.page,
                    text=chunk.text,
                    extraction_method=chunk.extraction_method,
                )
                for chunk in chunks
            ),
            structured_analysis=analysis,
            conversation_history=bounded_history,
            response_schema=TenderQuestionModelOutput.model_json_schema(),
            task_metadata={"prompt_version": PROMPT_VERSION},
        )

    @staticmethod
    def _input_hash(request: TenderQuestionGenerationRequest) -> str:
        value = {
            "question": request.question,
            "language": request.language,
            "chunks": [
                {
                    "page": chunk.page,
                    "text": chunk.text,
                    "extraction_method": chunk.extraction_method,
                }
                for chunk in request.chunks
            ],
            "analysis": request.structured_analysis,
            "history": request.conversation_history,
        }
        encoded = json.dumps(
            value, sort_keys=True, ensure_ascii=False, default=str
        ).encode("utf-8")
        return sha256(encoded).hexdigest()

    def _router(self) -> ModelGenerationRouter:
        if self._model_router is None:
            self._model_router = ModelGenerationRouter(
                settings=self.settings,
                model_repository=self._model_repository,
                providers=self._providers,
            )
        return self._model_router

    def history(
        self, tender_id: UUID, user_id: UUID
    ) -> TenderQuestionHistoryResponse:
        self._ready_tender(tender_id, user_id)
        rows = self.questions.list_history(tender_id, user_id)
        return TenderQuestionHistoryResponse(
            tender_id=tender_id,
            messages=[TenderChatMessage.model_validate(row) for row in rows],
        )

    def clear_history(self, tender_id: UUID, user_id: UUID) -> None:
        self._ready_tender(tender_id, user_id)
        self.questions.delete_history(tender_id, user_id)

    def _ready_tender(self, tender_id: UUID, user_id: UUID):
        tender = self.tenders.get_tender_by_id(tender_id, user_id=user_id)
        if tender is None:
            raise TenderQuestionNotFoundError("Tender was not found.")
        if (
            tender.document_type == "non_tender"
            or tender.document_validation_status == "invalid"
        ):
            raise TenderQuestionNotReadyError(
                "This file does not appear to be a tender."
            )
        if (
            tender.document_type == "uncertain"
            or tender.document_validation_status == "review"
        ):
            raise TenderQuestionNotReadyError(
                "Review this document before using Ask TenderMate."
            )
        if not tender.extracted_text_preview or tender.page_count is None:
            raise TenderQuestionNotReadyError(
                "Extract the tender before asking questions."
            )
        if not tender.analysis_json or tender.status != "analyzed":
            raise TenderQuestionNotReadyError(
                "Analyze the tender before asking questions."
            )
        return tender

    def _store_not_found(
        self,
        tender_id: UUID,
        user_id: UUID,
        conversation_id: UUID,
        question: str,
        language: str,
        started: float,
    ) -> TenderQuestionResponse:
        return self._store_response(
            tender_id,
            user_id,
            conversation_id,
            question,
            language,
            "accepted",
            NOT_FOUND[language],
            None,
            [],
            True,
            started,
        )

    def _store_response(
        self,
        tender_id: UUID,
        user_id: UUID,
        conversation_id: UUID,
        question: str,
        language: str,
        scope: str,
        answer: str,
        confidence: float | None,
        citations: list[dict[str, Any]],
        not_found: bool,
        started: float,
    ) -> TenderQuestionResponse:
        rows = self.questions.create_exchange(
            tender_id=tender_id,
            user_id=user_id,
            conversation_id=conversation_id,
            question=question,
            answer=answer,
            language=language,
            scope_status=scope,
            confidence=confidence,
            citations=citations,
            not_found=not_found,
        )
        assistant = next(
            (row for row in reversed(rows) if row.get("role") == "assistant"),
            None,
        )
        if not assistant:
            raise TenderQuestionUnavailableError(
                "Tender assistant could not store its response."
            )
        self.last_audit_metadata.update(
            {
                "scope_status": scope,
                "not_found": not_found,
                "latency_ms": round((perf_counter() - started) * 1000),
            }
        )
        return TenderQuestionResponse(
            answer=answer,
            language=language,
            scope_status=scope,
            confidence=confidence,
            citations=citations,
            not_found=not_found,
            conversation_id=conversation_id,
            message_id=assistant["id"],
        )

    @contextmanager
    def _exclusive(self, user_id: UUID, tender_id: UUID) -> Iterator[None]:
        key = (user_id, tender_id)
        with self._active_lock:
            if key in self._active:
                raise TenderQuestionBusyError(
                    "A question is already being answered for this tender."
                )
            self._active.add(key)
        try:
            yield
        finally:
            with self._active_lock:
                self._active.discard(key)


def get_tender_question_service() -> TenderQuestionService:
    return TenderQuestionService()
