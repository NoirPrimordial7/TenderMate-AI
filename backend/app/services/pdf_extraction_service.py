from io import BytesIO
from uuid import UUID

from app.core.config import Settings, get_settings
from app.repositories.pdf_extraction_repository import PDFExtractionRepository
from app.repositories.tender_repository import TenderRepository
from app.schemas.extraction import PDFExtractionResponse, TenderSourceResponse
from app.services.audit_service import record_audit_log
from app.services.gemini_ocr_service import (
    GEMINI_OCR_FAILED_MESSAGE,
    GeminiOCRFailedError,
    GeminiOCRNotConfiguredError,
    GeminiOCRService,
    OCRPage,
)
from app.services.usage_service import UsageService

PDF_EXTRACT_EVENT = "pdf_extract"
GEMINI_OCR_EVENT = "gemini_ocr"
PDF_EXTRACT_FAILED_MESSAGE = (
    "PDF text extraction failed. Please verify the PDF and try again."
)
TEXT_EXTRACTION_MESSAGE = "PDF text extracted successfully."
GEMINI_OCR_SUCCESS_MESSAGE = (
    "Scanned PDF detected. TenderMate OCR extracted text from the document."
)
PARTIAL_TEXT_AFTER_OCR_FAILURE_MESSAGE = (
    "TenderMate OCR could not improve this scanned PDF. Partial selectable text was saved."
)
SELECTABLE_PAGE_TEXT_MIN_CHARS = 80


class TenderNotFoundError(ValueError):
    pass


class PDFUploadMissingError(ValueError):
    pass


class PDFExtractionFailedError(RuntimeError):
    def __init__(
        self,
        message: str,
        audit_action: str = "pdf_extract_failed",
    ) -> None:
        super().__init__(message)
        self.audit_action = audit_action


class PDFExtractionService:
    def __init__(
        self,
        tender_repository: TenderRepository | None = None,
        extraction_repository: PDFExtractionRepository | None = None,
        gemini_ocr_service: GeminiOCRService | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._tender_repository = tender_repository or TenderRepository()
        self._extraction_repository = (
            extraction_repository or PDFExtractionRepository()
        )
        self._gemini_ocr_service = gemini_ocr_service or GeminiOCRService()
        self._settings = settings

    @property
    def settings(self) -> Settings:
        if self._settings is None:
            self._settings = get_settings()

        return self._settings

    def extract_tender_pdf(
        self,
        tender_id: UUID,
        user_id: UUID,
        usage_service: UsageService,
    ) -> PDFExtractionResponse:
        tender = self._tender_repository.get_tender_by_id(
            tender_id=tender_id,
            user_id=user_id,
        )
        if tender is None:
            raise TenderNotFoundError(
                f"Tender {tender_id} was not found or does not belong to the current user."
            )

        upload = self._extraction_repository.get_latest_upload_for_tender(
            tender_id=tender_id,
            user_id=user_id,
        )
        if not upload or not upload.get("storage_bucket") or not upload.get("storage_path"):
            raise PDFUploadMissingError(
                "No uploaded PDF was found for this tender."
            )

        try:
            pdf_bytes = self._extraction_repository.download_pdf(
                storage_bucket=str(upload["storage_bucket"]),
                storage_path=str(upload["storage_path"]),
            )
            page_texts = self._extract_page_texts(pdf_bytes)
            total_text_chars = self._count_text_chars(page_texts)

            if (
                total_text_chars >= self.settings.ocr_min_text_threshold
                or not self.settings.gemini_ocr_enabled
            ):
                return self._save_extraction_result(
                    tender_id=tender_id,
                    user_id=user_id,
                    upload_id=str(upload["id"]),
                    page_texts=page_texts,
                    extraction_methods=["text"] * len(page_texts),
                    extraction_method="text",
                    ocr_used=False,
                    usage_service=usage_service,
                    message=TEXT_EXTRACTION_MESSAGE,
                    metadata={
                        "text_characters": total_text_chars,
                        "ocr_threshold": self.settings.ocr_min_text_threshold,
                    },
                )

            return self._run_gemini_ocr_fallback(
                tender_id=tender_id,
                user_id=user_id,
                upload_id=str(upload["id"]),
                pdf_bytes=pdf_bytes,
                pypdf_page_texts=page_texts,
                usage_service=usage_service,
            )
        except PDFExtractionFailedError as exc:
            if exc.audit_action != "gemini_ocr_failed":
                self._mark_failed(
                    tender_id,
                    user_id,
                    str(exc) or PDF_EXTRACT_FAILED_MESSAGE,
                )
            raise
        except RuntimeError as exc:
            self._mark_failed(tender_id, user_id, PDF_EXTRACT_FAILED_MESSAGE)
            raise PDFExtractionFailedError(PDF_EXTRACT_FAILED_MESSAGE) from exc

    def _run_gemini_ocr_fallback(
        self,
        tender_id: UUID,
        user_id: UUID,
        upload_id: str,
        pdf_bytes: bytes,
        pypdf_page_texts: list[str],
        usage_service: UsageService,
    ) -> PDFExtractionResponse:
        pypdf_text_chars = self._count_text_chars(pypdf_page_texts)

        try:
            self._validate_ocr_limits(pdf_bytes, len(pypdf_page_texts))
            ocr_pages = self._gemini_ocr_service.transcribe_pdf(
                pdf_bytes=pdf_bytes,
                tender_id=tender_id,
            )
            ocr_text_chars = sum(len(page.text.strip()) for page in ocr_pages)
            if ocr_text_chars == 0:
                raise GeminiOCRFailedError(GEMINI_OCR_FAILED_MESSAGE)

            page_texts, extraction_methods = self._merge_ocr_pages(
                pypdf_page_texts=pypdf_page_texts,
                ocr_pages=ocr_pages,
            )
            extraction_method = self._overall_extraction_method(
                page_texts,
                extraction_methods,
            )
            response = self._save_extraction_result(
                tender_id=tender_id,
                user_id=user_id,
                upload_id=upload_id,
                page_texts=page_texts,
                extraction_methods=extraction_methods,
                extraction_method=extraction_method,
                ocr_used=True,
                usage_service=usage_service,
                message=GEMINI_OCR_SUCCESS_MESSAGE,
                metadata={
                    "text_characters": pypdf_text_chars,
                    "ocr_text_characters": ocr_text_chars,
                    "ocr_threshold": self.settings.ocr_min_text_threshold,
                    "ocr_model": self.settings.gemini_ocr_model,
                },
            )
            usage_service.record_usage_event(
                user_id=user_id,
                event_type=GEMINI_OCR_EVENT,
                resource_id=tender_id,
                metadata={
                    "upload_id": upload_id,
                    "page_count": response.page_count,
                    "pages_with_text": response.pages_with_text,
                    "model": self.settings.gemini_ocr_model,
                },
            )
            return response
        except (GeminiOCRFailedError, GeminiOCRNotConfiguredError) as exc:
            if pypdf_text_chars > 0:
                record_audit_log(
                    action="gemini_ocr_failed",
                    user_id=user_id,
                    resource_type="tender",
                    resource_id=tender_id,
                    metadata={"partial_text_saved": True},
                )
                return self._save_extraction_result(
                    tender_id=tender_id,
                    user_id=user_id,
                    upload_id=upload_id,
                    page_texts=pypdf_page_texts,
                    extraction_methods=["text"] * len(pypdf_page_texts),
                    extraction_method="text",
                    ocr_used=False,
                    usage_service=usage_service,
                    message=TEXT_EXTRACTION_MESSAGE,
                    error_message=PARTIAL_TEXT_AFTER_OCR_FAILURE_MESSAGE,
                    metadata={
                        "text_characters": pypdf_text_chars,
                        "ocr_failed": True,
                    },
                )

            self._mark_failed(
                tender_id=tender_id,
                user_id=user_id,
                error_message=GEMINI_OCR_FAILED_MESSAGE,
                extraction_method="gemini_ocr",
                ocr_used=True,
            )
            raise PDFExtractionFailedError(
                GEMINI_OCR_FAILED_MESSAGE,
                audit_action="gemini_ocr_failed",
            ) from exc

    def _save_extraction_result(
        self,
        tender_id: UUID,
        user_id: UUID,
        upload_id: str,
        page_texts: list[str],
        extraction_methods: list[str],
        extraction_method: str,
        ocr_used: bool,
        usage_service: UsageService,
        message: str,
        metadata: dict[str, object] | None = None,
        error_message: str | None = None,
    ) -> PDFExtractionResponse:
        page_count = len(page_texts)
        pages_with_text = sum(1 for text in page_texts if text.strip())
        preview = self._build_preview(page_texts)

        self._extraction_repository.replace_tender_pages(
            tender_id=tender_id,
            user_id=user_id,
            page_texts=page_texts,
            extraction_methods=extraction_methods,
        )
        self._extraction_repository.mark_tender_extracted(
            tender_id=tender_id,
            user_id=user_id,
            page_count=page_count,
            extracted_text_preview=preview,
            extraction_method=extraction_method,
            ocr_used=ocr_used,
            error_message=error_message,
        )
        usage_metadata = {
            "upload_id": upload_id,
            "page_count": page_count,
            "pages_with_text": pages_with_text,
            "extraction_method": extraction_method,
            "ocr_used": ocr_used,
        }
        if metadata:
            usage_metadata.update(metadata)
        usage_service.record_usage_event(
            user_id=user_id,
            event_type=PDF_EXTRACT_EVENT,
            resource_id=tender_id,
            metadata=usage_metadata,
        )

        return PDFExtractionResponse(
            tender_id=tender_id,
            status="extracted",
            page_count=page_count,
            pages_with_text=pages_with_text,
            extraction_method=extraction_method,
            ocr_used=ocr_used,
            message=message,
        )

    def get_tender_source(
        self,
        tender_id: UUID,
        user_id: UUID,
        expires_in: int = 300,
    ) -> TenderSourceResponse:
        tender = self._tender_repository.get_tender_by_id(
            tender_id=tender_id,
            user_id=user_id,
        )
        if tender is None:
            raise TenderNotFoundError(
                f"Tender {tender_id} was not found or does not belong to the current user."
            )
        upload = self._extraction_repository.get_latest_upload_for_tender(
            tender_id=tender_id,
            user_id=user_id,
        )
        if not upload or not upload.get("storage_bucket") or not upload.get("storage_path"):
            raise PDFUploadMissingError("No uploaded PDF was found for this tender.")
        signed_url = self._extraction_repository.create_signed_pdf_url(
            storage_bucket=str(upload["storage_bucket"]),
            storage_path=str(upload["storage_path"]),
            expires_in=expires_in,
        )
        return TenderSourceResponse(
            tender_id=tender_id,
            file_name=str(upload.get("file_name") or tender.original_file_name or "tender.pdf"),
            signed_url=signed_url,
            expires_in=expires_in,
        )

    @staticmethod
    def _extract_page_texts(pdf_bytes: bytes) -> list[str]:
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError(
                "PDF extraction dependency pypdf is not installed."
            ) from exc

        try:
            reader = PdfReader(BytesIO(pdf_bytes))
            page_texts: list[str] = []
            for page in reader.pages:
                try:
                    page_texts.append((page.extract_text() or "").strip())
                except Exception:
                    page_texts.append("")

            return page_texts
        except Exception as exc:
            raise PDFExtractionFailedError(PDF_EXTRACT_FAILED_MESSAGE) from exc

    @staticmethod
    def _build_preview(page_texts: list[str]) -> str | None:
        preview = " ".join(text for text in page_texts if text.strip())
        preview = " ".join(preview.split())
        return preview[:1000] if preview else None

    @staticmethod
    def _count_text_chars(page_texts: list[str]) -> int:
        return sum(len(text.strip()) for text in page_texts)

    def _validate_ocr_limits(self, pdf_bytes: bytes, page_count: int) -> None:
        max_pdf_bytes = max(1, self.settings.max_ocr_pdf_size_mb) * 1024 * 1024
        if len(pdf_bytes) > max_pdf_bytes:
            raise GeminiOCRFailedError(GEMINI_OCR_FAILED_MESSAGE)

        if page_count > max(1, self.settings.ocr_max_pages):
            raise GeminiOCRFailedError(GEMINI_OCR_FAILED_MESSAGE)

    @staticmethod
    def _merge_ocr_pages(
        pypdf_page_texts: list[str],
        ocr_pages: list[OCRPage],
    ) -> tuple[list[str], list[str]]:
        ocr_text_by_page = {page.page_number: page.text.strip() for page in ocr_pages}
        max_ocr_page = max(ocr_text_by_page, default=0)
        page_count = max(len(pypdf_page_texts), max_ocr_page)
        page_texts: list[str] = []
        extraction_methods: list[str] = []

        for page_number in range(1, page_count + 1):
            pypdf_text = (
                pypdf_page_texts[page_number - 1].strip()
                if page_number <= len(pypdf_page_texts)
                else ""
            )
            ocr_text = ocr_text_by_page.get(page_number, "")
            if PDFExtractionService._should_keep_pypdf_page_text(
                pypdf_text=pypdf_text,
                ocr_text=ocr_text,
            ):
                page_texts.append(pypdf_text)
                extraction_methods.append("text")
            elif ocr_text:
                page_texts.append(ocr_text)
                extraction_methods.append("gemini_ocr")
            elif pypdf_text:
                page_texts.append(pypdf_text)
                extraction_methods.append("text")
            else:
                page_texts.append("")
                extraction_methods.append("gemini_ocr")

        return page_texts, extraction_methods

    @staticmethod
    def _should_keep_pypdf_page_text(pypdf_text: str, ocr_text: str) -> bool:
        if len(pypdf_text) < SELECTABLE_PAGE_TEXT_MIN_CHARS:
            return False

        return not ocr_text or len(pypdf_text) >= int(len(ocr_text) * 0.8)

    @staticmethod
    def _overall_extraction_method(
        page_texts: list[str],
        extraction_methods: list[str],
    ) -> str:
        methods_with_text = {
            method
            for text, method in zip(page_texts, extraction_methods)
            if text.strip()
        }
        if "gemini_ocr" in methods_with_text and "text" in methods_with_text:
            return "mixed"
        if "gemini_ocr" in methods_with_text:
            return "gemini_ocr"

        return "text"

    def _mark_failed(
        self,
        tender_id: UUID,
        user_id: UUID,
        error_message: str,
        extraction_method: str | None = None,
        ocr_used: bool | None = None,
    ) -> None:
        try:
            self._extraction_repository.mark_tender_failed(
                tender_id=tender_id,
                user_id=user_id,
                error_message=error_message,
                extraction_method=extraction_method,
                ocr_used=ocr_used,
            )
        except RuntimeError:
            return


_pdf_extraction_service = PDFExtractionService()


def get_pdf_extraction_service() -> PDFExtractionService:
    return _pdf_extraction_service
