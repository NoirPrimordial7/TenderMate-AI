from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timezone
from hashlib import sha256
from random import random
from typing import Any, Callable
from uuid import UUID

from app.core.config import Settings, get_settings
from app.repositories.ai_model_repository import AIModelRepository
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.tender_repository import TenderRepository
from app.schemas.analysis import TenderAnalysisResponse
from app.services.analysis_output_validator import AnalysisOutputValidator
from app.services.model_provider import (
    InvalidModelOutput,
    ModelErrorCategory,
    ModelGenerationRequest,
    ModelGenerationResult,
    ModelProviderError,
    ProviderNotConfigured,
    SchemaValidationFailed,
    TenderModelProvider,
)
from app.services.model_provider_registry import ModelProviderRegistry
from app.services.tender_prompt_builder import build_tender_analysis_prompt
from app.services.usage_service import AnalysisLimitReachedError, UsageService

AI_ANALYSIS_EVENT = "ai_analysis"
ANALYSIS_NOT_CONFIGURED_MESSAGE = "AI analysis is not configured on this server."
ANALYSIS_NOT_READY_MESSAGE = "Extract PDF text before running AI analysis."
NO_EXTRACTED_TEXT_MESSAGE = "No extracted PDF text was found for this tender."
NON_TENDER_DOCUMENT_MESSAGE = (
    "This file does not appear to be a tender. Upload a tender document to continue."
)
ANALYSIS_FAILED_MESSAGE = "AI analysis failed. Please try again in a moment."
DAILY_QUOTA_EXCEEDED_MESSAGE = (
    "Daily AI analysis quota exceeded. Please try again tomorrow."
)
PROMPT_VERSION = "tender-analysis-2.0"
SCHEMA_VERSION = "2.0"


class AnalysisNotConfiguredError(RuntimeError):
    pass


class TenderAnalysisFailedError(RuntimeError):
    pass


class TenderNotFoundError(ValueError):
    pass


class AnalysisNotReadyError(ValueError):
    pass


class NoExtractedTextError(ValueError):
    pass


class AnalysisQuotaExceededError(ValueError):
    pass


class NonTenderDocumentError(ValueError):
    pass


class TenderAnalysisService:
    def __init__(
        self,
        tender_repository: TenderRepository | None = None,
        analysis_repository: AnalysisRepository | None = None,
        model_repository: AIModelRepository | None = None,
        settings: Settings | None = None,
        providers: dict[str, TenderModelProvider] | None = None,
        validator: AnalysisOutputValidator | None = None,
        sampler: Callable[[], float] = random,
    ) -> None:
        self._tender_repository = tender_repository or TenderRepository()
        self._analysis_repository = analysis_repository or AnalysisRepository()
        self._model_repository = model_repository or AIModelRepository()
        self._settings = settings
        self._providers = providers
        self._provider_registry: ModelProviderRegistry | None = None
        self._validator = validator or AnalysisOutputValidator()
        self._sampler = sampler

    @property
    def settings(self) -> Settings:
        if self._settings is None:
            self._settings = get_settings()
        return self._settings

    def analyze_tender(
        self,
        tender_id: UUID,
        user_id: UUID,
        usage_service: UsageService,
    ) -> TenderAnalysisResponse:
        tender = self._tender_repository.get_tender_by_id(
            tender_id=tender_id,
            user_id=user_id,
        )
        if tender is None:
            raise TenderNotFoundError(
                f"Tender {tender_id} was not found or does not belong to the current user."
            )
        if (
            tender.document_type == "non_tender"
            or tender.document_validation_status == "invalid"
        ):
            raise NonTenderDocumentError(
                tender.document_validation_reason or NON_TENDER_DOCUMENT_MESSAGE
            )

        pages = self._analysis_repository.list_tender_pages(
            tender_id=tender_id,
            user_id=user_id,
        )
        if not self._can_analyze_status(tender.status, pages):
            raise AnalysisNotReadyError(ANALYSIS_NOT_READY_MESSAGE)
        pages_with_text = [page for page in pages if str(page.get("text") or "").strip()]
        if not pages_with_text:
            raise NoExtractedTextError(NO_EXTRACTED_TEXT_MESSAGE)
        if not usage_service.can_run_ai_analysis(user_id):
            raise AnalysisLimitReachedError(
                "Free analysis limit reached. Please upgrade to continue."
            )
        self._enforce_daily_quota(user_id, usage_service)

        prompt = build_tender_analysis_prompt(
            pages=pages_with_text,
            max_input_chars=self.settings.max_model_input_chars,
        )
        request = ModelGenerationRequest(
            prompt=prompt,
            task="tender_analysis",
            require_json=True,
            temperature=0.2,
        )
        input_hash = sha256(prompt.encode("utf-8")).hexdigest()

        try:
            result, analysis_json = self._generate_with_fallback(
                request=request,
                user_id=user_id,
                tender_id=tender_id,
                input_hash=input_hash,
            )
            analysis_json["id"] = str(tender_id)
            self._analysis_repository.save_analysis(
                tender_id=tender_id,
                user_id=user_id,
                analysis_json=analysis_json,
            )
            usage_service.consume_analysis_credit(
                user_id=user_id,
                tender_id=tender_id,
            )
            self._run_shadow_if_sampled(
                request=request,
                user_id=user_id,
                tender_id=tender_id,
                input_hash=input_hash,
            )
        except AnalysisLimitReachedError:
            raise
        except AnalysisNotConfiguredError:
            self._mark_failed(tender_id, user_id)
            raise
        except TenderAnalysisFailedError:
            self._mark_failed(tender_id, user_id)
            raise
        except Exception as exc:
            self._mark_failed(tender_id, user_id)
            raise TenderAnalysisFailedError(ANALYSIS_FAILED_MESSAGE) from exc

        return TenderAnalysisResponse(
            tender_id=tender_id,
            status="analyzed",
            message="Tender analyzed successfully.",
        )

    def _generate_with_fallback(
        self,
        *,
        request: ModelGenerationRequest,
        user_id: UUID,
        tender_id: UUID,
        input_hash: str,
    ) -> tuple[ModelGenerationResult, dict[str, Any]]:
        provider_names = [self.settings.ai_provider]
        if self.settings.ai_fallback_provider not in provider_names:
            provider_names.append(self.settings.ai_fallback_provider)
        errors: list[ModelProviderError] = []
        for provider_name in provider_names:
            try:
                return self._generate_validated(
                    provider=self._get_provider(provider_name),
                    request=request,
                    user_id=user_id,
                    tender_id=tender_id,
                    input_hash=input_hash,
                    is_shadow=False,
                )
            except ModelProviderError as exc:
                errors.append(exc)
        last_error = errors[-1] if errors else None
        if errors and all(isinstance(error, ProviderNotConfigured) for error in errors):
            raise AnalysisNotConfiguredError(ANALYSIS_NOT_CONFIGURED_MESSAGE) from last_error
        raise TenderAnalysisFailedError(ANALYSIS_FAILED_MESSAGE) from last_error

    def _generate_validated(
        self,
        *,
        provider: TenderModelProvider,
        request: ModelGenerationRequest,
        user_id: UUID,
        tender_id: UUID,
        input_hash: str,
        is_shadow: bool,
    ) -> tuple[ModelGenerationResult, dict[str, Any]]:
        result: ModelGenerationResult | None = None
        try:
            result = provider.analyze_tender(request)
            try:
                _, analysis_json = self._validator.validate(result.raw_text)
            except (InvalidModelOutput, SchemaValidationFailed):
                repair_request = ModelGenerationRequest(
                    prompt=self._build_repair_prompt(request.prompt, result.raw_text),
                    task="tender_analysis_repair",
                    require_json=True,
                    temperature=0,
                )
                result = provider.analyze_tender(repair_request)
                _, analysis_json = self._validator.validate(result.raw_text)
            result = replace(result, parsed_json=analysis_json)
            self._record_run(
                result=result,
                user_id=user_id,
                tender_id=tender_id,
                input_hash=input_hash,
                status="success",
                validation_passed=True,
                is_shadow=is_shadow,
                error_category=None,
            )
            return result, analysis_json
        except ModelProviderError as exc:
            self._record_run(
                result=result,
                provider_name=provider.name,
                user_id=user_id,
                tender_id=tender_id,
                input_hash=input_hash,
                status=(
                    "invalid"
                    if isinstance(exc, (InvalidModelOutput, SchemaValidationFailed))
                    else "error"
                ),
                validation_passed=False,
                is_shadow=is_shadow,
                error_category=exc.category,
            )
            raise

    def _run_shadow_if_sampled(
        self,
        *,
        request: ModelGenerationRequest,
        user_id: UUID,
        tender_id: UUID,
        input_hash: str,
    ) -> None:
        shadow_name = self.settings.ai_shadow_provider
        if (
            not shadow_name
            or self.settings.ai_shadow_sample_rate <= 0
            or self._sampler() >= self.settings.ai_shadow_sample_rate
        ):
            return
        try:
            self._generate_validated(
                provider=self._get_provider(shadow_name),
                request=request,
                user_id=user_id,
                tender_id=tender_id,
                input_hash=input_hash,
                is_shadow=True,
            )
        except Exception:
            return

    def _get_provider(self, provider_name: str) -> TenderModelProvider:
        if self._providers is not None:
            try:
                return self._providers[provider_name]
            except KeyError as exc:
                raise ProviderNotConfigured(
                    "AI analysis is not configured on this server."
                ) from exc
        if self._provider_registry is None:
            self._provider_registry = ModelProviderRegistry(self.settings)
        return self._provider_registry.get(provider_name)

    def _record_run(
        self,
        *,
        user_id: UUID,
        tender_id: UUID,
        input_hash: str,
        status: str,
        validation_passed: bool,
        is_shadow: bool,
        error_category: ModelErrorCategory | None,
        result: ModelGenerationResult | None = None,
        provider_name: str | None = None,
    ) -> None:
        values = {
            "user_id": str(user_id),
            "tender_id": str(tender_id),
            "task": "tender_analysis",
            "provider": result.provider if result else provider_name or "unknown",
            "model_name": result.model_name if result else "unknown",
            "prompt_version": PROMPT_VERSION,
            "schema_version": SCHEMA_VERSION,
            "input_hash": input_hash,
            "status": status,
            "latency_ms": result.latency_ms if result else None,
            "input_tokens": result.input_tokens if result else None,
            "output_tokens": result.output_tokens if result else None,
            "validation_passed": validation_passed,
            "is_shadow": is_shadow,
            "error_category": error_category.value if error_category else None,
        }
        try:
            self._model_repository.record_model_run(values)
        except RuntimeError:
            # Observability must never make a successful user analysis unavailable.
            return

    def _enforce_daily_quota(
        self, user_id: UUID, usage_service: UsageService
    ) -> None:
        start_of_day = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        analyses_today = usage_service.count_usage_events(
            user_id=user_id,
            event_type=AI_ANALYSIS_EVENT,
            since_datetime=start_of_day,
        )
        if analyses_today >= self.settings.max_ai_analyses_per_day:
            raise AnalysisQuotaExceededError(DAILY_QUOTA_EXCEEDED_MESSAGE)

    @staticmethod
    def _build_repair_prompt(original_prompt: str, raw_output: str) -> str:
        return (
            f"{original_prompt}\n\n"
            "The previous response below was invalid. Return one corrected JSON object "
            "only, matching the requested schema. Do not add commentary or code fences.\n\n"
            f"Previous response:\n{raw_output}"
        )

    @staticmethod
    def _can_analyze_status(status: str, pages: list[dict[str, Any]]) -> bool:
        return status in {"extracted", "analyzed"} or (
            status == "failed" and bool(pages)
        )

    def _mark_failed(self, tender_id: UUID, user_id: UUID) -> None:
        try:
            self._analysis_repository.mark_analysis_failed(
                tender_id=tender_id,
                user_id=user_id,
                error_message=ANALYSIS_FAILED_MESSAGE,
            )
        except RuntimeError:
            return


_tender_analysis_service = TenderAnalysisService()


def get_tender_analysis_service() -> TenderAnalysisService:
    return _tender_analysis_service
