from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

RiskLevel = Literal["Low", "Medium", "High"]


class TenderAnalysisPayload(BaseModel):
    id: str
    snapshot: dict[str, Any]
    decision: dict[str, Any]
    scores: list[dict[str, Any]]
    beforeApply: list[dict[str, Any]]
    documents: list[dict[str, Any]]
    eligibility: list[dict[str, Any]]
    financials: list[dict[str, Any]]
    technical: list[dict[str, Any]]
    dates: list[dict[str, Any]]
    risks: list[dict[str, Any]]
    missingInformation: list[str]
    departmentQuestions: list[str]
    proposalDraft: str


class TenderResponse(BaseModel):
    id: UUID
    title: str
    organization: str | None = None
    category: str | None = None
    location: str | None = None
    deadline: str | None = None
    risk_level: RiskLevel | None = None
    fit_score: int | None = Field(default=None, ge=0, le=100)
    status: str = "uploaded"
    analysis_json: TenderAnalysisPayload | None = None
    original_file_name: str | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
