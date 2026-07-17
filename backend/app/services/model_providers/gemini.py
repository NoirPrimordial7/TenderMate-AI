from __future__ import annotations

from time import monotonic
from typing import Any, Callable

from app.core.config import Settings, get_settings
from app.services.model_provider import (
    ModelGenerationRequest,
    ModelGenerationResult,
    ProviderHealth,
    ProviderNotConfigured,
    ProviderRateLimited,
    ProviderTimeout,
    ProviderUnavailable,
    TenderQuestionGenerationRequest,
)
from app.services.tender_question_prompt_builder import build_tender_question_prompt


class GeminiTenderProvider:
    name = "gemini"

    def __init__(
        self,
        settings: Settings | None = None,
        client_factory: Callable[[], Any] | None = None,
    ) -> None:
        self._settings = settings
        self._client_factory = client_factory

    @property
    def settings(self) -> Settings:
        if self._settings is None:
            self._settings = get_settings()
        return self._settings

    def analyze_tender(
        self, request: ModelGenerationRequest
    ) -> ModelGenerationResult:
        return self._generate(request, self.settings.gemini_model)

    def answer_question(
        self, request: TenderQuestionGenerationRequest
    ) -> ModelGenerationResult:
        generation_request = build_tender_question_prompt(
            request,
            max_context_chars=self.settings.max_tender_question_context_chars,
            max_output_tokens=self.settings.max_tender_question_output_tokens,
        )
        return self._generate(generation_request, self.settings.gemini_model)

    def healthcheck(self) -> ProviderHealth:
        configured = bool(self.settings.gemini_api_key)
        return ProviderHealth(
            provider=self.name,
            configured=configured,
            available=configured,
            detail=None if configured else "Gemini credentials are not configured.",
        )

    def model_name_for(self, _task: str) -> str:
        return self.settings.gemini_model

    def _generate(
        self, request: ModelGenerationRequest, model_name: str
    ) -> ModelGenerationResult:
        if not self.settings.gemini_api_key:
            raise ProviderNotConfigured("The AI provider is not configured on this server.")

        started = monotonic()
        try:
            client, types = self._build_client()
            config_values: dict[str, Any] = {
                "response_mime_type": (
                    "application/json" if request.require_json else "text/plain"
                ),
                "temperature": request.temperature,
            }
            if request.max_output_tokens is not None:
                config_values["max_output_tokens"] = request.max_output_tokens
            response = client.models.generate_content(
                model=model_name,
                contents=request.prompt,
                config=types.GenerateContentConfig(**config_values),
            )
        except (ProviderNotConfigured, ProviderTimeout, ProviderRateLimited):
            raise
        except Exception as exc:
            self._raise_controlled(exc)

        raw_text = str(getattr(response, "text", "") or "").strip()
        usage = getattr(response, "usage_metadata", None)
        finish_reason = self._finish_reason(response)
        return ModelGenerationResult(
            raw_text=raw_text,
            parsed_json=None,
            provider=self.name,
            model_name=model_name,
            latency_ms=max(0, int((monotonic() - started) * 1000)),
            input_tokens=self._int_or_none(
                getattr(usage, "prompt_token_count", None)
            ),
            output_tokens=self._int_or_none(
                getattr(usage, "candidates_token_count", None)
            ),
            request_id=self._string_or_none(getattr(response, "response_id", None)),
            finish_reason=finish_reason,
        )

    def _build_client(self) -> tuple[Any, Any]:
        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise ProviderNotConfigured(
                "The configured AI provider is unavailable on this server."
            ) from exc

        if self._client_factory is not None:
            return self._client_factory(), types

        timeout_ms = max(1, self.settings.gemini_request_timeout_seconds) * 1000
        try:
            client = genai.Client(
                api_key=self.settings.gemini_api_key,
                http_options=types.HttpOptions(timeout=timeout_ms),
            )
        except Exception:
            client = genai.Client(api_key=self.settings.gemini_api_key)
        return client, types

    @staticmethod
    def _raise_controlled(exc: Exception) -> None:
        name = exc.__class__.__name__.lower()
        message = str(exc).lower()
        if "timeout" in name or "timed out" in message or "deadline" in name:
            raise ProviderTimeout("The AI provider timed out.") from exc
        if "resourceexhausted" in name or "rate" in message and "limit" in message:
            raise ProviderRateLimited("The AI provider rate limit was reached.") from exc
        raise ProviderUnavailable("The AI provider is temporarily unavailable.") from exc

    @staticmethod
    def _finish_reason(response: Any) -> str | None:
        candidates = getattr(response, "candidates", None) or []
        reason = getattr(candidates[0], "finish_reason", None) if candidates else None
        return GeminiTenderProvider._string_or_none(reason)

    @staticmethod
    def _int_or_none(value: Any) -> int | None:
        return value if isinstance(value, int) else None

    @staticmethod
    def _string_or_none(value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None
