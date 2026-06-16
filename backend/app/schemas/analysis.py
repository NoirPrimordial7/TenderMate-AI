from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

RiskLevel = Literal["Low", "Medium", "High"]
RequirementStatus = Literal["Ready", "Missing", "Not Verified"]
RequirementPriority = Literal["Required", "Optional"]
BeforeApplyStatus = Literal["ready", "warning", "missing"]
DateStatus = Literal["done", "upcoming", "unknown"]


class SourceReference(BaseModel):
    page: int = Field(default=1, ge=1)
    clause: str = "Not specified"
    title: str = "Not specified"
    text: str = "Not specified"


class TenderSnapshot(BaseModel):
    title: str = "Not specified"
    tenderId: str = "Not specified"
    organization: str = "Not specified"
    location: str = "Not specified"
    category: str = "Not specified"
    estimatedValue: str = "Not specified"
    emdAmount: str = "Not specified"
    submissionDeadline: str = "Not specified"
    contractDuration: str = "Not specified"


class DecisionSummary(BaseModel):
    shouldApply: str = "Review"
    recommendation: str = "Review the tender details before applying."
    overallFitScore: int = Field(default=0, ge=0, le=100)
    riskLevel: RiskLevel = "Medium"
    deadlineUrgency: RiskLevel = "Medium"
    missingCriticalRequirements: int = Field(default=0, ge=0)


class ScoreItem(BaseModel):
    label: str
    value: int = Field(ge=0, le=100)
    display: str


class BeforeApplyItem(BaseModel):
    label: str
    status: BeforeApplyStatus


class DocumentRequirement(BaseModel):
    name: str
    priority: RequirementPriority = "Required"
    status: RequirementStatus = "Not Verified"
    source: SourceReference


class EligibilityRequirement(BaseModel):
    title: str
    text: str
    impact: RiskLevel = "Medium"
    userStatus: RequirementStatus = "Not Verified"
    source: SourceReference


class FinancialItem(BaseModel):
    label: str
    value: str
    note: str | None = None
    chartAmount: int | None = None
    source: SourceReference


class TechnicalRequirement(BaseModel):
    requirement: str
    source: SourceReference


class DateItem(BaseModel):
    label: str
    date: str
    status: DateStatus = "unknown"


class RiskItem(BaseModel):
    title: str
    level: RiskLevel = "Medium"
    explanation: str
    source: SourceReference


class TenderAnalysisPayload(BaseModel):
    id: str = ""
    snapshot: TenderSnapshot = Field(default_factory=TenderSnapshot)
    decision: DecisionSummary = Field(default_factory=DecisionSummary)
    scores: list[ScoreItem] = Field(default_factory=list)
    beforeApply: list[BeforeApplyItem] = Field(default_factory=list)
    documents: list[DocumentRequirement] = Field(default_factory=list)
    eligibility: list[EligibilityRequirement] = Field(default_factory=list)
    financials: list[FinancialItem] = Field(default_factory=list)
    technical: list[TechnicalRequirement] = Field(default_factory=list)
    dates: list[DateItem] = Field(default_factory=list)
    risks: list[RiskItem] = Field(default_factory=list)
    missingInformation: list[str] = Field(default_factory=list)
    departmentQuestions: list[str] = Field(default_factory=list)
    proposalDraft: str = ""


class GeminiAnalysisResponse(BaseModel):
    tender_id: UUID
    status: str
    message: str
