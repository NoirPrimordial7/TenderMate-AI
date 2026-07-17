from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

FeedbackType = Literal[
    "correct",
    "incorrect",
    "missing",
    "wrong_source",
    "unclear",
    "hallucinated",
]


class AIOutputFeedbackCreate(BaseModel):
    model_run_id: UUID | None = None
    field_path: str = Field(min_length=1, max_length=500)
    feedback_type: FeedbackType
    original_value: Any | None = None
    corrected_value: Any | None = None
    source_page: int | None = Field(default=None, ge=1)
    source_quote: str | None = Field(default=None, max_length=4000)


class AIOutputFeedbackResponse(AIOutputFeedbackCreate):
    id: UUID
    user_id: UUID
    tender_id: UUID
    created_at: datetime
