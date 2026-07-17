from __future__ import annotations

from app.core.config import Settings
from app.services.model_provider import ProviderNotConfigured, TenderModelProvider
from app.services.model_providers import (
    GeminiTenderProvider,
    OpenAICompatibleTenderProvider,
)


class ModelProviderFactory:
    """The single construction and lookup point for all model providers."""

    def __init__(
        self,
        settings: Settings,
        providers: dict[str, TenderModelProvider] | None = None,
    ) -> None:
        self._providers = providers or {
            "gemini": GeminiTenderProvider(settings=settings),
            "openai_compatible": OpenAICompatibleTenderProvider(settings=settings),
        }

    def get(self, provider_name: str) -> TenderModelProvider:
        try:
            return self._providers[provider_name]
        except KeyError as exc:
            raise ProviderNotConfigured(
                "The configured AI provider is unavailable on this server."
            ) from exc
