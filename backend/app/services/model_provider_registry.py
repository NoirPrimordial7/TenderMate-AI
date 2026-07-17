from __future__ import annotations

from app.core.config import Settings
from app.services.model_provider import ProviderNotConfigured, TenderModelProvider
from app.services.model_providers import (
    GeminiTenderProvider,
    OpenAICompatibleTenderProvider,
)


class ModelProviderRegistry:
    def __init__(self, settings: Settings) -> None:
        self._providers: dict[str, TenderModelProvider] = {
            "gemini": GeminiTenderProvider(settings=settings),
            "openai_compatible": OpenAICompatibleTenderProvider(settings=settings),
        }

    def get(self, provider_name: str) -> TenderModelProvider:
        try:
            return self._providers[provider_name]
        except KeyError as exc:
            raise ProviderNotConfigured(
                "AI analysis is not configured on this server."
            ) from exc
