from __future__ import annotations

import json
import re
from typing import Any

from pydantic import ValidationError

from app.schemas.analysis import TenderAnalysisPayload
from app.services.model_provider import InvalidModelOutput, SchemaValidationFailed

_JSON_FENCE = re.compile(r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL | re.IGNORECASE)


class AnalysisOutputValidator:
    def validate(self, raw_text: str) -> tuple[TenderAnalysisPayload, dict[str, Any]]:
        candidate = raw_text.strip()
        match = _JSON_FENCE.fullmatch(candidate)
        if match:
            candidate = match.group(1).strip()
        try:
            parsed = json.loads(candidate)
        except (json.JSONDecodeError, TypeError) as exc:
            raise InvalidModelOutput("The model returned invalid JSON.") from exc
        if not isinstance(parsed, dict):
            raise InvalidModelOutput("The model output must be a JSON object.")
        try:
            payload = TenderAnalysisPayload(**parsed)
        except ValidationError as exc:
            raise SchemaValidationFailed(
                "The model output did not match the analysis schema."
            ) from exc
        return payload, self.model_to_dict(payload)

    @staticmethod
    def model_to_dict(payload: TenderAnalysisPayload) -> dict[str, Any]:
        if hasattr(payload, "model_dump"):
            return payload.model_dump()
        return payload.dict()
