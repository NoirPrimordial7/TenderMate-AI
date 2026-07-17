from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

RiskLevel = Literal["Low", "Medium", "High"]
RequirementStatus = Literal["Ready", "Missing", "Not Verified"]
RequirementPriority = Literal["Required", "Optional"]
BeforeApplyStatus = Literal["ready", "warning", "missing"]
DateStatus = Literal["done", "upcoming", "unknown"]
ExtractionMethod = Literal["text", "ocr", "mixed"]


class SourceReference(BaseModel):
    page: int = Field(default=1, ge=1)
    clause: str = "Not specified"
    title: str = "Not specified"
    text: str = "Not specified"
    confidence: float | None = Field(default=None, ge=0, le=1)
    extractionMethod: ExtractionMethod | None = None
    blockId: str | None = None


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
    positiveFactors: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    uncertainties: list[str] = Field(default_factory=list)
    explanation: str = ""


class ScoreItem(BaseModel):
    key: str | None = None
    label: str
    value: int = Field(ge=0, le=100)
    display: str
    explanation: str = ""
    sourceCount: int = Field(default=0, ge=0)


class BeforeApplyItem(BaseModel):
    label: str
    status: BeforeApplyStatus


class DocumentRequirement(BaseModel):
    name: str
    priority: RequirementPriority = "Required"
    status: RequirementStatus = "Not Verified"
    source: SourceReference
    reason: str = ""
    preparationAction: str = ""
    userVerified: bool | None = None


class EligibilityRequirement(BaseModel):
    title: str
    text: str
    impact: RiskLevel = "Medium"
    userStatus: RequirementStatus = "Not Verified"
    source: SourceReference
    mandatory: bool | None = None
    verificationReason: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)


class FinancialItem(BaseModel):
    label: str
    value: str
    note: str | None = None
    chartAmount: int | None = None
    source: SourceReference
    type: str = "Not specified"
    currency: str = "INR"
    normalizedAmount: float | None = Field(default=None, ge=0)
    refundable: bool | None = None
    mandatory: bool | None = None


class TechnicalRequirement(BaseModel):
    requirement: str
    source: SourceReference
    category: str = "Other"
    mandatory: bool | None = None
    acceptanceCriteria: str = ""
    explanation: str = ""
    userStatus: RequirementStatus = "Not Verified"


class DateItem(BaseModel):
    label: str
    date: str
    status: DateStatus = "unknown"
    isoDate: str | None = None
    source: SourceReference | None = None
    urgency: Literal["Low", "Medium", "High", "Unknown"] = "Unknown"


class RiskItem(BaseModel):
    title: str
    level: RiskLevel = "Medium"
    explanation: str
    source: SourceReference
    likelihood: RiskLevel | None = None
    consequence: str = ""
    mitigation: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)


class AnalysisSummary(BaseModel):
    executiveSummary: str = ""
    strongestReasonToApply: str = ""
    strongestReasonNotToApply: str = ""
    nextBestAction: str = ""


class ReadinessScores(BaseModel):
    eligibilityScore: int | None = Field(default=None, ge=0, le=100)
    documentsScore: int | None = Field(default=None, ge=0, le=100)
    financialScore: int | None = Field(default=None, ge=0, le=100)
    technicalScore: int | None = Field(default=None, ge=0, le=100)
    timelineScore: int | None = Field(default=None, ge=0, le=100)


class TenderAnalysisPayload(BaseModel):
    schemaVersion: str = "2.0"
    language: str | None = None
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
    analysisSummary: AnalysisSummary = Field(default_factory=AnalysisSummary)
    readiness: ReadinessScores = Field(default_factory=ReadinessScores)


class GeminiAnalysisResponse(BaseModel):
    tender_id: UUID
    status: str
    message: str
