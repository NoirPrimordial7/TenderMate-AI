from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.analysis import TenderAnalysisPayload

RiskLevel = Literal["Low", "Medium", "High"]

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
    extracted_text_preview: str | None = None
    page_count: int | None = None
    extraction_method: str | None = None
    ocr_used: bool = False
    ocr_confidence: float | None = None
    document_type: Literal["tender", "non_tender", "uncertain"] | None = None
    document_validation_status: Literal["valid", "invalid", "review", "pending"] | None = None
    document_validation_confidence: float | None = Field(default=None, ge=0, le=1)
    document_validation_reason: str | None = None
    created_at: datetime
    updated_at: datetime
