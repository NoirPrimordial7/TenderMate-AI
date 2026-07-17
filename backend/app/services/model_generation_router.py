from __future__ import annotations

from dataclasses import dataclass
from random import random
from typing import Callable, Generic, TypeVar
from uuid import UUID

from app.core.config import Settings
from app.repositories.ai_model_repository import AIModelRepository
from app.services.model_provider import (
    InvalidModelOutput,
    ModelErrorCategory,
    ModelGenerationResult,
    ModelProviderError,
    ProviderNotConfigured,
    SchemaValidationFailed,
    TenderModelProvider,
)
from app.services.model_provider_factory import ModelProviderFactory

RequestT = TypeVar("RequestT")
ValueT = TypeVar("ValueT")


@dataclass(frozen=True)
class ValidatedModelOutput(Generic[ValueT]):
    value: ValueT
    validation_passed: bool = True
    error_category: ModelErrorCategory | None = None
    result: ModelGenerationResult | None = None


@dataclass(frozen=True)
class RoutedModelOutput(Generic[ValueT]):
    result: ModelGenerationResult
    value: ValueT


class ModelRoutingFailed(ModelProviderError):
    def __init__(self, errors: list[ModelProviderError]) -> None:
        self.errors = errors
        self.category = errors[-1].category if errors else ModelErrorCategory.UNKNOWN
        super().__init__("All configured AI providers failed.")

    @property
    def all_not_configured(self) -> bool:
        return bool(self.errors) and all(
            isinstance(error, ProviderNotConfigured) for error in self.errors
        )

    @property
    def all_validation_failed(self) -> bool:
        return bool(self.errors) and all(
            isinstance(error, (InvalidModelOutput, SchemaValidationFailed))
            for error in self.errors
        )


class ModelGenerationRouter:
    def __init__(
        self,
        *,
        settings: Settings,
        model_repository: AIModelRepository | None = None,
        provider_factory: ModelProviderFactory | None = None,
        providers: dict[str, TenderModelProvider] | None = None,
        sampler: Callable[[], float] = random,
    ) -> None:
        self.settings = settings
        self.model_repository = model_repository or AIModelRepository()
        self.provider_factory = provider_factory or ModelProviderFactory(
            settings, providers=providers
        )
        self.sampler = sampler

    def generate(
        self,
        *,
        task: str,
        request: RequestT,
        invoke: Callable[[TenderModelProvider, RequestT], ModelGenerationResult],
        validate: Callable[
            [TenderModelProvider, ModelGenerationResult], ValidatedModelOutput[ValueT]
        ],
        user_id: UUID,
        tender_id: UUID,
        input_hash: str,
        prompt_version: str,
        schema_version: str,
    ) -> RoutedModelOutput[ValueT]:
        errors: list[ModelProviderError] = []
        for provider_name in self._primary_provider_names():
            provider: TenderModelProvider | None = None
            try:
                provider = self.provider_factory.get(provider_name)
                result = invoke(provider, request)
                validated = validate(provider, result)
                effective_result = validated.result or result
                self._record(
                    task=task,
                    user_id=user_id,
                    tender_id=tender_id,
                    input_hash=input_hash,
                    prompt_version=prompt_version,
                    schema_version=schema_version,
                    result=effective_result,
                    status="success" if validated.validation_passed else "invalid",
                    validation_passed=validated.validation_passed,
                    is_shadow=False,
                    error_category=validated.error_category,
                )
                self._run_shadow(
                    task=task,
                    request=request,
                    invoke=invoke,
                    validate=validate,
                    user_id=user_id,
                    tender_id=tender_id,
                    input_hash=input_hash,
                    prompt_version=prompt_version,
                    schema_version=schema_version,
                    primary_provider=effective_result.provider,
                )
                return RoutedModelOutput(
                    result=effective_result, value=validated.value
                )
            except ModelProviderError as exc:
                errors.append(exc)
                self._record_error(
                    task=task,
                    user_id=user_id,
                    tender_id=tender_id,
                    input_hash=input_hash,
                    prompt_version=prompt_version,
                    schema_version=schema_version,
                    provider_name=provider.name if provider else provider_name,
                    model_name=self._model_name(provider, task),
                    error=exc,
                    is_shadow=False,
                )
        raise ModelRoutingFailed(errors)

    def _run_shadow(
        self,
        *,
        task: str,
        request: RequestT,
        invoke: Callable[[TenderModelProvider, RequestT], ModelGenerationResult],
        validate: Callable[
            [TenderModelProvider, ModelGenerationResult], ValidatedModelOutput[ValueT]
        ],
        user_id: UUID,
        tender_id: UUID,
        input_hash: str,
        prompt_version: str,
        schema_version: str,
        primary_provider: str,
    ) -> None:
        shadow_name = self.settings.ai_shadow_provider
        if (
            not shadow_name
            or shadow_name == primary_provider
            or self.settings.ai_shadow_sample_rate <= 0
            or user_id not in self.settings.ai_shadow_user_allowlist
            or self.sampler() >= self.settings.ai_shadow_sample_rate
        ):
            return
        provider: TenderModelProvider | None = None
        try:
            provider = self.provider_factory.get(shadow_name)
            result = invoke(provider, request)
            validated = validate(provider, result)
            effective_result = validated.result or result
            self._record(
                task=task,
                user_id=user_id,
                tender_id=tender_id,
                input_hash=input_hash,
                prompt_version=prompt_version,
                schema_version=schema_version,
                result=effective_result,
                status="success" if validated.validation_passed else "invalid",
                validation_passed=validated.validation_passed,
                is_shadow=True,
                error_category=validated.error_category,
            )
        except ModelProviderError as exc:
            self._record_error(
                task=task,
                user_id=user_id,
                tender_id=tender_id,
                input_hash=input_hash,
                prompt_version=prompt_version,
                schema_version=schema_version,
                provider_name=provider.name if provider else shadow_name,
                model_name=self._model_name(provider, task),
                error=exc,
                is_shadow=True,
            )
        except Exception:
            return

    def _primary_provider_names(self) -> list[str]:
        names = [self.settings.ai_provider]
        if self.settings.ai_fallback_provider not in names:
            names.append(self.settings.ai_fallback_provider)
        return names

    def _record_error(self, **values) -> None:
        error = values.pop("error")
        self._record(
            **values,
            result=None,
            status=(
                "invalid"
                if isinstance(error, (InvalidModelOutput, SchemaValidationFailed))
                else "error"
            ),
            validation_passed=False,
            error_category=error.category,
        )

    def _record(
        self,
        *,
        task: str,
        user_id: UUID,
        tender_id: UUID,
        input_hash: str,
        prompt_version: str,
        schema_version: str,
        status: str,
        validation_passed: bool,
        is_shadow: bool,
        error_category: ModelErrorCategory | None,
        result: ModelGenerationResult | None,
        provider_name: str | None = None,
        model_name: str | None = None,
    ) -> None:
        row = {
            "user_id": str(user_id),
            "tender_id": str(tender_id),
            "task": task,
            "provider": result.provider if result else provider_name or "unknown",
            "model_name": result.model_name if result else model_name or "unknown",
            "prompt_version": prompt_version,
            "schema_version": schema_version,
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
            self.model_repository.record_model_run(row)
        except RuntimeError:
            return

    @staticmethod
    def _model_name(provider: TenderModelProvider | None, task: str) -> str | None:
        if provider is None:
            return None
        resolver = getattr(provider, "model_name_for", None)
        if callable(resolver):
            value = resolver(task)
            return str(value) if value else None
        value = getattr(provider, "model_name", None)
        return str(value) if value else None
