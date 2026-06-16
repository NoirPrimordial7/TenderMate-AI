from datetime import datetime, timezone
from uuid import UUID

from app.repositories.tender_repository import TenderRepository
from app.repositories.upload_repository import UploadRepository
from app.schemas.upload import UploadResponse
from app.services.usage_service import UsageService

MAX_PDF_UPLOAD_BYTES = 20 * 1024 * 1024
PDF_UPLOAD_EVENT = "pdf_upload"


class InvalidPdfUploadError(ValueError):
    pass


class PdfUploadTooLargeError(ValueError):
    pass


class UploadQuotaExceededError(ValueError):
    pass


class UploadService:
    def __init__(
        self,
        tender_repository: TenderRepository | None = None,
        upload_repository: UploadRepository | None = None,
    ) -> None:
        self._tender_repository = tender_repository or TenderRepository()
        self._upload_repository = upload_repository or UploadRepository()

    def create_pdf_upload(
        self,
        user_id: UUID,
        file_name: str | None,
        mime_type: str | None,
        file_bytes: bytes,
        usage_service: UsageService,
        max_uploads_per_day: int,
    ) -> UploadResponse:
        safe_file_name = self._validate_file(file_name, mime_type, file_bytes)
        normalized_mime_type = "application/pdf"
        file_size = len(file_bytes)

        start_of_day = datetime.now(timezone.utc).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        upload_count = usage_service.count_usage_events(
            user_id=user_id,
            event_type=PDF_UPLOAD_EVENT,
            since_datetime=start_of_day,
        )
        if upload_count >= max_uploads_per_day:
            raise UploadQuotaExceededError(
                "Daily upload limit reached. Please try again tomorrow."
            )

        tender = self._tender_repository.create_uploaded_tender(
            user_id=user_id,
            title=self._derive_title(safe_file_name),
            original_file_name=safe_file_name,
        )
        storage_path = f"users/{user_id}/tenders/{tender.id}/original.pdf"

        try:
            self._upload_repository.upload_pdf(
                storage_path=storage_path,
                file_bytes=file_bytes,
                mime_type=normalized_mime_type,
            )
            upload = self._upload_repository.create_upload_metadata(
                tender_id=tender.id,
                user_id=user_id,
                file_name=safe_file_name,
                file_size=file_size,
                mime_type=normalized_mime_type,
                storage_path=storage_path,
            )
        except RuntimeError as exc:
            self._upload_repository.delete_pdf(storage_path)
            self._tender_repository.mark_tender_upload_failed(
                tender_id=tender.id,
                user_id=user_id,
                error_message=str(exc),
            )
            raise

        usage_service.record_usage_event(
            user_id=user_id,
            event_type=PDF_UPLOAD_EVENT,
            resource_id=upload.upload_id,
            metadata={
                "tender_id": str(tender.id),
                "file_name": safe_file_name,
                "file_size": file_size,
                "mime_type": normalized_mime_type,
                "storage_bucket": upload.storage_bucket,
                "storage_path": storage_path,
            },
        )

        return upload

    @staticmethod
    def _validate_file(
        file_name: str | None,
        mime_type: str | None,
        file_bytes: bytes,
    ) -> str:
        safe_file_name = UploadService._safe_file_name(file_name)
        normalized_mime_type = UploadService._normalize_mime_type(mime_type)
        is_pdf = normalized_mime_type == "application/pdf" or safe_file_name.lower().endswith(
            ".pdf"
        )

        if not is_pdf:
            raise InvalidPdfUploadError("Only PDF files can be uploaded.")

        if not file_bytes:
            raise InvalidPdfUploadError("Uploaded PDF is empty.")

        if len(file_bytes) > MAX_PDF_UPLOAD_BYTES:
            raise PdfUploadTooLargeError("PDF files must be 20 MB or smaller.")

        return safe_file_name

    @staticmethod
    def _safe_file_name(file_name: str | None) -> str:
        if not file_name:
            raise InvalidPdfUploadError("A PDF file is required.")

        safe_file_name = file_name.replace("\\", "/").split("/")[-1].strip()
        if not safe_file_name:
            raise InvalidPdfUploadError("A PDF file is required.")

        return safe_file_name

    @staticmethod
    def _normalize_mime_type(mime_type: str | None) -> str:
        if not mime_type:
            return "application/pdf"

        return mime_type.split(";", 1)[0].strip().lower()

    @staticmethod
    def _derive_title(file_name: str) -> str:
        title = file_name.rsplit(".", 1)[0] if "." in file_name else file_name
        title = title.replace("_", " ").replace("-", " ").strip()
        return title or "Uploaded tender PDF"


_upload_service = UploadService()


def get_upload_service() -> UploadService:
    return _upload_service
