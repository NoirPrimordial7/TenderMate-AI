from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SignupRequest(BaseModel):
    full_name: str
    email: str
    password: str


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
    created_at: datetime | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
