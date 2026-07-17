from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Literal

from app.services.tender_retriever import RetrievedTenderChunk

ScopeStatus = Literal["accepted", "rejected", "uncertain"]


@dataclass(frozen=True)
class ProviderCitation:
    page: int
    clause: str
    title: str
    quote: str
    confidence: float | None = None


@dataclass(frozen=True)
class ProviderAnswer:
    answer: str
    confidence: float | None
    citations: list[ProviderCitation] = field(default_factory=list)
    not_found: bool = False
    input_tokens: int | None = None
    output_tokens: int | None = None


class TenderQuestionProvider(ABC):
    provider_name: str
    model_name: str

    @abstractmethod
    def classify_scope(self, question: str, language: str) -> ScopeStatus:
        raise NotImplementedError

    @abstractmethod
    def answer_question(
        self,
        *,
        question: str,
        language: str,
        chunks: list[RetrievedTenderChunk],
        analysis: dict[str, Any],
        history: list[dict[str, Any]],
    ) -> ProviderAnswer:
        raise NotImplementedError
