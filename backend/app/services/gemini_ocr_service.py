import json
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from app.core.config import Settings, get_settings

GEMINI_OCR_PROMPT = (
    "Transcribe this tender PDF page by page. Return strict JSON only. "
    "Preserve page numbers. Do not summarize. Do not analyze. If a page is "
    "unreadable, return empty text for that page."
)
GEMINI_OCR_NOT_CONFIGURED_MESSAGE = "Gemini OCR is not configured on this server."
GEMINI_OCR_FAILED_MESSAGE = (
    "OCR could not read this scanned PDF. Please upload a clearer PDF."
)
GEMINI_OCR_INVALID_RESPONSE_MESSAGE = (
    "Gemini OCR returned an unreadable response. Please try again with a clearer PDF."
)


class GeminiOCRNotConfiguredError(RuntimeError):
    pass


class GeminiOCRFailedError(RuntimeError):
    pass


@dataclass(frozen=True)
class OCRPage:
    page_number: int
    text: str


class GeminiOCRService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings

    @property
    def settings(self) -> Settings:
        if self._settings is None:
            self._settings = get_settings()

        return self._settings

    def transcribe_pdf(self, pdf_bytes: bytes, tender_id: UUID) -> list[OCRPage]:
        if not self.settings.gemini_api_key:
            raise GeminiOCRNotConfiguredError(GEMINI_OCR_NOT_CONFIGURED_MESSAGE)

        try:
            from google import genai
            from google.genai import types
        except Exception as exc:
            raise GeminiOCRFailedError(
                "Gemini OCR is not available on this server."
            ) from exc

        try:
            client = self._build_client(genai, types)
            response = client.models.generate_content(
                model=self.settings.gemini_ocr_model,
                contents=[
                    types.Part.from_bytes(
                        data=pdf_bytes,
                        mime_type="application/pdf",
                    ),
                    GEMINI_OCR_PROMPT,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0,
                ),
            )
            raw_text = str(getattr(response, "text", "") or "").strip()
            return self._parse_ocr_pages(raw_text)
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            raise GeminiOCRFailedError(GEMINI_OCR_INVALID_RESPONSE_MESSAGE) from exc
        except (GeminiOCRFailedError, GeminiOCRNotConfiguredError):
            raise
        except Exception as exc:
            raise GeminiOCRFailedError(GEMINI_OCR_FAILED_MESSAGE) from exc

    def _build_client(self, genai: Any, types: Any) -> Any:
        timeout_ms = max(1, self.settings.gemini_ocr_timeout_seconds) * 1000
        try:
            return genai.Client(
                api_key=self.settings.gemini_api_key,
                http_options=types.HttpOptions(timeout=timeout_ms),
            )
        except Exception:
            return genai.Client(api_key=self.settings.gemini_api_key)

    @staticmethod
    def _parse_ocr_pages(raw_text: str) -> list[OCRPage]:
        payload = GeminiOCRService._parse_json_object(raw_text)
        pages = payload.get("pages")
        if not isinstance(pages, list):
            raise ValueError("Gemini OCR payload must include a pages list.")

        parsed_pages: list[OCRPage] = []
        seen_page_numbers: set[int] = set()
        for page in pages:
            if not isinstance(page, dict):
                raise ValueError("Gemini OCR page entries must be JSON objects.")

            page_number = int(page.get("page_number"))
            if page_number <= 0 or page_number in seen_page_numbers:
                continue

            text = page.get("text", "")
            parsed_pages.append(
                OCRPage(
                    page_number=page_number,
                    text=str(text).strip() if text is not None else "",
                )
            )
            seen_page_numbers.add(page_number)

        if not parsed_pages:
            raise ValueError("Gemini OCR returned no page text entries.")

        return sorted(parsed_pages, key=lambda page: page.page_number)

    @staticmethod
    def _parse_json_object(raw_text: str) -> dict[str, Any]:
        if raw_text.startswith("```"):
            raw_text = raw_text.strip("`")
            if raw_text.startswith("json"):
                raw_text = raw_text[4:].strip()

        start_index = raw_text.find("{")
        end_index = raw_text.rfind("}")
        if start_index == -1 or end_index == -1 or end_index < start_index:
            raise json.JSONDecodeError("No JSON object found.", raw_text, 0)

        parsed = json.loads(raw_text[start_index : end_index + 1])
        if not isinstance(parsed, dict):
            raise ValueError("Gemini OCR payload must be a JSON object.")

        return parsed


_gemini_ocr_service = GeminiOCRService()


def get_gemini_ocr_service() -> GeminiOCRService:
    return _gemini_ocr_service
