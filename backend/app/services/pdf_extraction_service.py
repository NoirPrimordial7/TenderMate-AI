from io import BytesIO
from uuid import UUID

from app.repositories.pdf_extraction_repository import PDFExtractionRepository
from app.repositories.tender_repository import TenderRepository
from app.schemas.extraction import PDFExtractionResponse
from app.services.usage_service import UsageService

PDF_EXTRACT_EVENT = "pdf_extract"
PDF_EXTRACT_FAILED_MESSAGE = (
    "PDF text extraction failed. Please verify the PDF and try again."
)


class TenderNotFoundError(ValueError):
    pass


class PDFUploadMissingError(ValueError):
    pass


class PDFExtractionFailedError(RuntimeError):
    pass


class PDFExtractionService:
    def __init__(
        self,
        tender_repository: TenderRepository | None = None,
        extraction_repository: PDFExtractionRepository | None = None,
    ) -> None:
        self._tender_repository = tender_repository or TenderRepository()
        self._extraction_repository = (
            extraction_repository or PDFExtractionRepository()
        )

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
            page_count = len(page_texts)
            pages_with_text = sum(1 for text in page_texts if text.strip())
            preview = self._build_preview(page_texts)

            self._extraction_repository.replace_tender_pages(
                tender_id=tender_id,
                user_id=user_id,
                page_texts=page_texts,
            )
            self._extraction_repository.mark_tender_extracted(
                tender_id=tender_id,
                user_id=user_id,
                page_count=page_count,
                extracted_text_preview=preview,
            )
            usage_service.record_usage_event(
                user_id=user_id,
                event_type=PDF_EXTRACT_EVENT,
                resource_id=tender_id,
                metadata={
                    "upload_id": str(upload["id"]),
                    "page_count": page_count,
                    "pages_with_text": pages_with_text,
                },
            )
        except PDFExtractionFailedError:
            self._mark_failed(tender_id, user_id, PDF_EXTRACT_FAILED_MESSAGE)
            raise
        except RuntimeError as exc:
            self._mark_failed(tender_id, user_id, PDF_EXTRACT_FAILED_MESSAGE)
            raise PDFExtractionFailedError(PDF_EXTRACT_FAILED_MESSAGE) from exc

        message = (
            "PDF text extraction completed, but no selectable text was found. "
            "The PDF may be scanned."
            if pages_with_text == 0
            else "PDF text extracted successfully."
        )
        return PDFExtractionResponse(
            tender_id=tender_id,
            status="extracted",
            page_count=page_count,
            pages_with_text=pages_with_text,
            message=message,
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

    def _mark_failed(
        self,
        tender_id: UUID,
        user_id: UUID,
        error_message: str,
    ) -> None:
        try:
            self._extraction_repository.mark_tender_failed(
                tender_id=tender_id,
                user_id=user_id,
                error_message=error_message,
            )
        except RuntimeError:
            return


_pdf_extraction_service = PDFExtractionService()


def get_pdf_extraction_service() -> PDFExtractionService:
    return _pdf_extraction_service
