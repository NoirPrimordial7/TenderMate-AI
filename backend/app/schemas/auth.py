from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, model_validator

LanguageCode = Literal["en", "hi", "mr"]


class SignupRequest(BaseModel):
    full_name: str
    email: str
    password: str
    preferred_language: LanguageCode = "en"
    preferred_analysis_language: LanguageCode = "en"
    accepted_legal: bool
    legal_locale: LanguageCode = "en"


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str
    is_active: bool
    free_analysis_credits: int
    plan_name: str
    subscription_status: str
    preferred_language: LanguageCode = "en"
    preferred_analysis_language: LanguageCode = "en"
    created_at: datetime | None = None


class UserPreferencesUpdate(BaseModel):
    preferred_language: LanguageCode | None = None
    preferred_analysis_language: LanguageCode | None = None

    @model_validator(mode="after")
    def require_preference(self) -> "UserPreferencesUpdate":
        if self.preferred_language is None and self.preferred_analysis_language is None:
            raise ValueError("At least one language preference is required.")
        return self


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
