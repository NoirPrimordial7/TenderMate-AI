from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class MfaChallengeRequest(BaseModel):
    challenge_token: str = Field(min_length=20, max_length=4096)
    code: str | None = Field(default=None, min_length=6, max_length=6)
    recovery_code: str | None = Field(default=None, min_length=8, max_length=32)

    @model_validator(mode="after")
    def require_one_code(self) -> "MfaChallengeRequest":
        if bool(self.code) == bool(self.recovery_code):
            raise ValueError("Provide either an authenticator code or one recovery code.")
        return self


class PasswordVerificationRequest(BaseModel):
    # Existing accounts may predate the stronger password policy. Their current
    # password must remain verifiable so they can rotate it to a stronger value.
    password: str = Field(min_length=1, max_length=256)
    code: str | None = Field(default=None, min_length=6, max_length=6)


class MfaConfirmRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class MfaSetupResponse(BaseModel):
    secret: str
    otpauth_uri: str


class RecoveryCodesResponse(BaseModel):
    recovery_codes: list[str]


class SecurityStatusResponse(BaseModel):
    mfa_enabled: bool
    mfa_required: bool
    recovery_codes_remaining: int
    recent_login_valid: bool


class SessionResponse(BaseModel):
    id: UUID
    device: str
    ip_hint: str | None = None
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    current: bool = False


class SecurityEventResponse(BaseModel):
    id: UUID
    event_type: str
    success: bool
    device: str | None = None
    ip_hint: str | None = None
    created_at: datetime


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=12, max_length=256)
    mfa_code: str | None = Field(default=None, min_length=6, max_length=6)


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    turnstile_token: str | None = None


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(min_length=32, max_length=512)
    new_password: str = Field(min_length=12, max_length=256)


class PasswordResetAcceptedResponse(BaseModel):
    accepted: Literal[True] = True
