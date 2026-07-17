from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

LanguageCode = Literal["en", "hi", "mr"]
ScopeStatus = Literal["accepted", "rejected", "uncertain"]
MessageRole = Literal["user", "assistant", "system"]


class TenderQuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    language: LanguageCode = "en"
    conversation_id: UUID | None = None

    @field_validator("question")
    @classmethod
    def normalize_question(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Question is required.")
        return normalized


class QuestionCitation(BaseModel):
    page: int = Field(ge=1)
    clause: str = "Not specified"
    title: str = "Source evidence"
    quote: str
    confidence: float | None = Field(default=None, ge=0, le=1)
    extraction_method: str | None = None


class TenderQuestionModelCitation(BaseModel):
    page: int = Field(ge=1)
    clause: str = "Not specified"
    title: str = "Source evidence"
    quote: str = Field(min_length=1)
    confidence: float | None = Field(default=None, ge=0, le=1)


class TenderQuestionModelOutput(BaseModel):
    answer: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)
    not_found: bool = False
    citations: list[TenderQuestionModelCitation] = Field(default_factory=list)


class TenderQuestionResponse(BaseModel):
    answer: str
    language: LanguageCode
    scope_status: ScopeStatus
    confidence: float | None = Field(default=None, ge=0, le=1)
    citations: list[QuestionCitation] = Field(default_factory=list)
    not_found: bool = False
    conversation_id: UUID
    message_id: UUID


class TenderChatMessage(BaseModel):
    id: UUID
    conversation_id: UUID
    tender_id: UUID
    role: MessageRole
    content: str
    language: LanguageCode
    scope_status: ScopeStatus
    confidence: float | None = Field(default=None, ge=0, le=1)
    citations: list[QuestionCitation] = Field(default_factory=list)
    not_found: bool = False
    created_at: datetime


class TenderQuestionHistoryResponse(BaseModel):
    tender_id: UUID
    messages: list[TenderChatMessage] = Field(default_factory=list)
