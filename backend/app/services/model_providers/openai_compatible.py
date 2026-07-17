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


class OpenAICompatibleTenderProvider:
    name = "openai_compatible"

    def __init__(
        self,
        settings: Settings | None = None,
        client_factory: Callable[..., Any] | None = None,
    ) -> None:
        self._settings = settings
        self._client_factory = client_factory
        self._client: Any | None = None

    @property
    def settings(self) -> Settings:
        if self._settings is None:
            self._settings = get_settings()
        return self._settings

    def analyze_tender(
        self, request: ModelGenerationRequest
    ) -> ModelGenerationResult:
        return self._generate(request, self.settings.tendermate_analysis_model)

    def answer_question(
        self, request: TenderQuestionGenerationRequest
    ) -> ModelGenerationResult:
        generation_request = build_tender_question_prompt(
            request,
            max_context_chars=self.settings.max_tender_question_context_chars,
            max_output_tokens=self.settings.max_tender_question_output_tokens,
        )
        return self._generate(
            generation_request, self.settings.tendermate_assistant_model
        )

    def healthcheck(self) -> ProviderHealth:
        auth_configured = (
            bool(self.settings.tendermate_model_api_key)
            if self.settings.tendermate_model_auth_mode == "bearer"
            else bool(
                self.settings.tendermate_model_modal_key
                and self.settings.tendermate_model_modal_secret
            )
        )
        configured = bool(
            self.settings.tendermate_model_base_url
            and self.settings.tendermate_analysis_model
            and self.settings.tendermate_assistant_model
            and auth_configured
        )
        return ProviderHealth(
            provider=self.name,
            configured=configured,
            available=configured,
            detail=None if configured else "Self-hosted model settings are incomplete.",
        )

    def model_name_for(self, task: str) -> str:
        return (
            self.settings.tendermate_assistant_model
            if task == "tender_question"
            else self.settings.tendermate_analysis_model
        )

    def _generate(
        self, request: ModelGenerationRequest, model_name: str
    ) -> ModelGenerationResult:
        if not self.healthcheck().configured:
            raise ProviderNotConfigured("The AI provider is not configured on this server.")

        client = self._build_client()
        payload: dict[str, Any] = {
            "model": model_name,
            "messages": [{"role": "user", "content": request.prompt}],
            "temperature": request.temperature,
        }
        if request.require_json:
            payload["response_format"] = {"type": "json_object"}
        if request.max_output_tokens is not None:
            payload["max_tokens"] = request.max_output_tokens

        started = monotonic()
        try:
            response = client.post("chat/completions", json=dict(payload))
            if request.require_json and response.status_code in {400, 404, 422}:
                payload.pop("response_format", None)
                response = client.post("chat/completions", json=dict(payload))
            self._raise_for_status(response)
            body = response.json()
            raw_text, finish_reason = self._extract_choice(body)
        except (ProviderTimeout, ProviderRateLimited, ProviderUnavailable):
            raise
        except Exception as exc:
            self._raise_controlled(exc)

        usage = body.get("usage") if isinstance(body, dict) else None
        usage = usage if isinstance(usage, dict) else {}
        request_id = None
        if isinstance(body, dict):
            request_id = self._string_or_none(body.get("id"))
        if request_id is None:
            request_id = self._string_or_none(
                getattr(response, "headers", {}).get("x-request-id")
            )
        return ModelGenerationResult(
            raw_text=raw_text,
            parsed_json=None,
            provider=self.name,
            model_name=model_name,
            latency_ms=max(0, int((monotonic() - started) * 1000)),
            input_tokens=self._int_or_none(usage.get("prompt_tokens")),
            output_tokens=self._int_or_none(usage.get("completion_tokens")),
            request_id=request_id,
            finish_reason=finish_reason,
        )

    def _build_client(self) -> Any:
        if self._client is not None:
            return self._client
        if self._client_factory is not None:
            factory = self._client_factory
            self._client = factory(
                base_url=self.settings.tendermate_model_base_url.rstrip("/"),
                headers=self._authentication_headers(),
                timeout=max(1, self.settings.tendermate_model_timeout_seconds),
            )
            return self._client
        try:
            import httpx
        except ImportError as exc:
            raise ProviderNotConfigured(
                "The configured AI provider is unavailable on this server."
            ) from exc

        self._client = httpx.Client(
            base_url=self.settings.tendermate_model_base_url.rstrip("/"),
            headers=self._authentication_headers(),
            timeout=max(1, self.settings.tendermate_model_timeout_seconds),
        )
        return self._client

    def _authentication_headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.settings.tendermate_model_auth_mode == "modal_proxy":
            headers["Modal-Key"] = self.settings.tendermate_model_modal_key
            headers["Modal-Secret"] = self.settings.tendermate_model_modal_secret
        else:
            headers["Authorization"] = (
                f"Bearer {self.settings.tendermate_model_api_key}"
            )
        return headers

    @staticmethod
    def _raise_for_status(response: Any) -> None:
        status_code = int(getattr(response, "status_code", 500))
        if status_code == 429:
            raise ProviderRateLimited("The AI provider rate limit was reached.")
        if status_code >= 500:
            raise ProviderUnavailable("The AI provider is temporarily unavailable.")
        if status_code >= 400:
            raise ProviderUnavailable("The AI provider rejected the request.")

    @staticmethod
    def _extract_choice(body: Any) -> tuple[str, str | None]:
        try:
            choice = body["choices"][0]
            content = choice["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderUnavailable("The AI provider returned a malformed response.") from exc
        if not isinstance(content, str) or not content.strip():
            raise ProviderUnavailable("The AI provider returned a malformed response.")
        return content.strip(), OpenAICompatibleTenderProvider._string_or_none(
            choice.get("finish_reason")
        )

    @staticmethod
    def _raise_controlled(exc: Exception) -> None:
        name = exc.__class__.__name__.lower()
        message = str(exc).lower()
        if "timeout" in name or "timed out" in message:
            raise ProviderTimeout("The AI provider timed out.") from exc
        if "connect" in name or "connection" in message:
            raise ProviderUnavailable("The AI provider is temporarily unavailable.") from exc
        raise ProviderUnavailable("The AI provider returned a malformed response.") from exc

    @staticmethod
    def _int_or_none(value: Any) -> int | None:
        return value if isinstance(value, int) else None

    @staticmethod
    def _string_or_none(value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None
