from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

AccountStatus = Literal["active", "suspended", "restricted", "pending_deletion", "deleted", "anonymized"]
StaffRoleName = Literal["super_admin", "admin", "support", "finance", "reviewer"]


class AdminUserSummary(BaseModel):
    id: UUID
    full_name: str
    email: str
    account_status: AccountStatus
    email_verified: bool
    mfa_enabled: bool
    role: str
    plan_name: str
    subscription_status: str
    analysis_credits: int
    question_credits: int
    tender_count: int = 0
    last_active_at: datetime | None = None
    created_at: datetime
    security_flags: list[str] = []


class AdminUserPage(BaseModel):
    items: list[AdminUserSummary]
    next_cursor: str | None = None


class AdminOverview(BaseModel):
    metrics: dict[str, int | float | str | None]
    system_health: str
    staff_role: str
    permissions: list[str]
    assurance: Literal["aal2"] = "aal2"
    deferred: list[str] = ["paid_users", "payments", "refunds"]


class ReasonedAction(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)
    confirmation: str = Field(min_length=2, max_length=200)


class AccountStatusChange(ReasonedAction):
    status: AccountStatus


class StaffRoleChange(ReasonedAction):
    role: StaffRoleName | Literal["msme_user"]


class CreditAdjustment(BaseModel):
    credit_type: Literal["analysis", "question"]
    amount: int = Field(ge=-100000, le=100000)
    reason_category: str = Field(min_length=2, max_length=80)
    internal_note: str = Field(min_length=3, max_length=1000)
    idempotency_key: UUID
    confirmation: str | None = Field(default=None, max_length=100)


class AdminNoteCreate(BaseModel):
    category: str = Field(min_length=2, max_length=60)
    note: str = Field(min_length=3, max_length=2000)

    @field_validator("note")
    @classmethod
    def reject_secret_material(cls, value: str) -> str:
        lowered = value.lower()
        prohibited = ("password=", "api_key", "private key", "recovery code", "totp secret", "card number", "cvv")
        if any(item in lowered for item in prohibited): raise ValueError("Do not store credentials or secret material in admin notes.")
        return " ".join(value.split())


class FeedbackUpdate(ReasonedAction):
    status: Literal["new", "reviewing", "planned", "implemented", "rejected"]
    assigned_staff_id: UUID | None = None
    internal_notes: str | None = Field(default=None, max_length=2000)


class AdminAuditEvent(BaseModel):
    id: UUID
    actor_user_id: UUID | None
    actor_role: str
    action: str
    target_type: str
    target_id: str | None
    reason: str
    metadata: dict[str, Any]
    correlation_id: UUID
    created_at: datetime
