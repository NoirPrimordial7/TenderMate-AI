import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.repositories.gemini_analysis_repository import GeminiAnalysisRepository
from app.repositories.tender_repository import TenderRepository
from app.schemas.analysis import GeminiAnalysisResponse, TenderAnalysisPayload
from app.services.gemini_prompt_builder import build_gemini_analysis_prompt
from app.services.usage_service import AnalysisLimitReachedError, UsageService

AI_ANALYSIS_EVENT = "ai_analysis"
GEMINI_NOT_CONFIGURED_MESSAGE = "AI analysis is not configured on this server."
ANALYSIS_NOT_READY_MESSAGE = "Extract PDF text before running AI analysis."
NO_EXTRACTED_TEXT_MESSAGE = "No extracted PDF text was found for this tender."
ANALYSIS_FAILED_MESSAGE = "AI analysis failed. Please try again in a moment."
DAILY_QUOTA_EXCEEDED_MESSAGE = "Daily AI analysis quota exceeded. Please try again tomorrow."


class GeminiNotConfiguredError(RuntimeError):
    pass


class GeminiAnalysisFailedError(RuntimeError):
    pass


class TenderNotFoundError(ValueError):
    pass


class AnalysisNotReadyError(ValueError):
    pass


class NoExtractedTextError(ValueError):
    pass


class AnalysisQuotaExceededError(ValueError):
    pass


class GeminiAnalysisService:
    def __init__(
        self,
        tender_repository: TenderRepository | None = None,
        analysis_repository: GeminiAnalysisRepository | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._tender_repository = tender_repository or TenderRepository()
        self._analysis_repository = analysis_repository or GeminiAnalysisRepository()
        self._settings = settings

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
    ) -> GeminiAnalysisResponse:
        if not self.settings.gemini_api_key:
            raise GeminiNotConfiguredError(GEMINI_NOT_CONFIGURED_MESSAGE)

        tender = self._tender_repository.get_tender_by_id(
            tender_id=tender_id,
            user_id=user_id,
        )
        if tender is None:
            raise TenderNotFoundError(
                f"Tender {tender_id} was not found or does not belong to the current user."
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

        prompt = build_gemini_analysis_prompt(
            pages=pages_with_text,
            max_input_chars=self.settings.max_gemini_input_chars,
        )

        try:
            analysis_json = self._generate_analysis(prompt)
            analysis_json["id"] = str(tender_id)
            self._analysis_repository.save_analysis(
                tender_id=tender_id,
                user_id=user_id,
                analysis_json=analysis_json,
            )
            usage_service.consume_analysis_credit(user_id=user_id, tender_id=tender_id)
        except AnalysisLimitReachedError:
            raise
        except GeminiAnalysisFailedError:
            self._mark_failed(tender_id, user_id)
            raise
        except Exception as exc:
            self._mark_failed(tender_id, user_id)
            raise GeminiAnalysisFailedError(ANALYSIS_FAILED_MESSAGE) from exc

        return GeminiAnalysisResponse(
            tender_id=tender_id,
            status="analyzed",
            message="Tender analyzed successfully.",
        )

    def _generate_analysis(self, prompt: str) -> dict[str, Any]:
        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise GeminiAnalysisFailedError(
                "Google GenAI SDK is not installed on this server."
            ) from exc

        try:
            client = self._build_client(genai, types)
            response = client.models.generate_content(
                model=self.settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            raw_text = str(getattr(response, "text", "") or "").strip()
            payload = TenderAnalysisPayload(**self._parse_json(raw_text))
            return self._model_to_dict(payload)
        except (json.JSONDecodeError, ValidationError, ValueError) as exc:
            raise GeminiAnalysisFailedError(
                "Gemini returned an invalid analysis format."
            ) from exc
        except GeminiAnalysisFailedError:
            raise
        except Exception as exc:
            raise GeminiAnalysisFailedError(ANALYSIS_FAILED_MESSAGE) from exc

    def _build_client(self, genai: Any, types: Any) -> Any:
        timeout_ms = max(1, self.settings.gemini_request_timeout_seconds) * 1000
        try:
            return genai.Client(
                api_key=self.settings.gemini_api_key,
                http_options=types.HttpOptions(timeout=timeout_ms),
            )
        except Exception:
            return genai.Client(api_key=self.settings.gemini_api_key)

    def _enforce_daily_quota(
        self,
        user_id: UUID,
        usage_service: UsageService,
    ) -> None:
        start_of_day = datetime.now(timezone.utc).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        analyses_today = usage_service.count_usage_events(
            user_id=user_id,
            event_type=AI_ANALYSIS_EVENT,
            since_datetime=start_of_day,
        )
        if analyses_today >= self.settings.max_ai_analyses_per_day:
            raise AnalysisQuotaExceededError(DAILY_QUOTA_EXCEEDED_MESSAGE)

    @staticmethod
    def _can_analyze_status(status: str, pages: list[dict[str, Any]]) -> bool:
        if status in {"extracted", "analyzed"}:
            return True

        return status == "failed" and bool(pages)

    @staticmethod
    def _parse_json(raw_text: str) -> dict[str, Any]:
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`")
            if raw_text.startswith("json"):
                raw_text = raw_text[4:].strip()

        parsed = json.loads(raw_text)
        if not isinstance(parsed, dict):
            raise ValueError("Gemini analysis payload must be a JSON object.")

        return parsed

    @staticmethod
    def _model_to_dict(payload: TenderAnalysisPayload) -> dict[str, Any]:
        if hasattr(payload, "model_dump"):
            return payload.model_dump()

        return payload.dict()

    def _mark_failed(
        self,
        tender_id: UUID,
        user_id: UUID,
    ) -> None:
        try:
            self._analysis_repository.mark_analysis_failed(
                tender_id=tender_id,
                user_id=user_id,
                error_message=ANALYSIS_FAILED_MESSAGE,
            )
        except RuntimeError:
            return


_gemini_analysis_service = GeminiAnalysisService()


def get_gemini_analysis_service() -> GeminiAnalysisService:
    return _gemini_analysis_service
