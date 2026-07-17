from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol


class ModelErrorCategory(str, Enum):
    NOT_CONFIGURED = "not_configured"
    TIMEOUT = "timeout"
    UNAVAILABLE = "unavailable"
    INVALID_OUTPUT = "invalid_output"
    SCHEMA_VALIDATION = "schema_validation"
    RATE_LIMITED = "rate_limited"
    UNKNOWN = "unknown"


@dataclass(frozen=True)
class TokenUsage:
    input_tokens: int | None = None
    output_tokens: int | None = None


@dataclass(frozen=True)
class ModelGenerationRequest:
    prompt: str
    task: str
    require_json: bool = False
    temperature: float = 0.2
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ModelGenerationResult:
    raw_text: str
    parsed_json: dict[str, Any] | None
    provider: str
    model_name: str
    latency_ms: int
    input_tokens: int | None = None
    output_tokens: int | None = None
    request_id: str | None = None
    finish_reason: str | None = None


@dataclass(frozen=True)
class ProviderHealth:
    provider: str
    configured: bool
    available: bool
    detail: str | None = None


class TenderModelProvider(Protocol):
    name: str

    def analyze_tender(
        self, request: ModelGenerationRequest
    ) -> ModelGenerationResult: ...

    def answer_question(
        self, request: ModelGenerationRequest
    ) -> ModelGenerationResult: ...

    def healthcheck(self) -> ProviderHealth: ...


class ModelProviderError(RuntimeError):
    category = ModelErrorCategory.UNKNOWN


class ProviderNotConfigured(ModelProviderError):
    category = ModelErrorCategory.NOT_CONFIGURED


class ProviderTimeout(ModelProviderError):
    category = ModelErrorCategory.TIMEOUT


class ProviderUnavailable(ModelProviderError):
    category = ModelErrorCategory.UNAVAILABLE


class InvalidModelOutput(ModelProviderError):
    category = ModelErrorCategory.INVALID_OUTPUT


class SchemaValidationFailed(ModelProviderError):
    category = ModelErrorCategory.SCHEMA_VALIDATION


class ProviderRateLimited(ModelProviderError):
    category = ModelErrorCategory.RATE_LIMITED
