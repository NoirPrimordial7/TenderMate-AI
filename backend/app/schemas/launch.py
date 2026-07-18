from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

LanguageCode = Literal["en", "hi", "mr"]
DocumentType = Literal["terms", "privacy", "ai_disclaimer"]
FeedbackCategory = Literal["incorrect", "accuracy", "missing", "design", "feature", "pricing", "performance", "technical", "other"]


class LegalAcceptanceRequest(BaseModel):
    locale: LanguageCode
    accepted: bool


class LegalAcceptanceStatus(BaseModel):
    required: bool
    accepted_documents: list[DocumentType]
    missing_documents: list[DocumentType]
    version: str


class TrainingConsentRequest(BaseModel):
    allowed: bool


class TrainingConsentResponse(BaseModel):
    allowed: bool


class ProductFeedbackCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: FeedbackCategory
    message: str = Field(min_length=10, max_length=2000)
    email: str | None = Field(default=None, max_length=254)
    locale: LanguageCode
    page_path: str = Field(min_length=1, max_length=300)
    tender_id: UUID | None = None
    performance_mode: Literal["full", "low"]
    viewport_class: Literal["mobile", "tablet", "laptop", "desktop"]

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        clean = " ".join(value.split())
        if "<script" in clean.lower() or "javascript:" in clean.lower():
            raise ValueError("Feedback contains unsupported markup.")
        return clean

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        clean = value.strip().lower()
        if "@" not in clean or clean.startswith("@") or clean.endswith("@"):
            raise ValueError("Enter a valid email address.")
        return clean

    @field_validator("page_path")
    @classmethod
    def validate_path(cls, value: str) -> str:
        if not value.startswith("/") or "\\" in value:
            raise ValueError("Invalid page path.")
        return value


class ProductFeedbackResponse(BaseModel):
    id: UUID
    status: Literal["new", "reviewing", "planned", "implemented", "rejected"]
    created_at: str
