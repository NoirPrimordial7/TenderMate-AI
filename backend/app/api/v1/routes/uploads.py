from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.rate_limit import (
    UPLOAD_RATE_LIMIT,
    check_rate_limit_for_user_or_ip,
    get_client_ip,
    get_user_agent,
)
from app.core.config import Settings, get_settings
from app.schemas.auth import UserResponse
from app.schemas.upload import UploadResponse
from app.services.audit_service import record_audit_log
from app.services.rate_limit_service import RateLimitService, get_rate_limit_service
from app.services.upload_service import (
    InvalidPdfUploadError,
    MAX_PDF_UPLOAD_BYTES,
    PdfUploadTooLargeError,
    UploadQuotaExceededError,
    UploadService,
    get_upload_service,
)
from app.services.usage_service import UsageService, get_usage_service

router = APIRouter(prefix="/tenders", tags=["uploads"])
DAILY_UPLOAD_LIMIT_MESSAGE = "Daily upload limit reached. Please try again tomorrow."
PDF_UPLOAD_CONFIG_MESSAGE = "Supabase configuration is required for PDF upload."
PDF_UPLOAD_STORAGE_MESSAGE = "Could not upload PDF to storage. Please try again."


def get_pdf_upload_usage_service() -> UsageService:
    try:
        return get_usage_service()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=PDF_UPLOAD_CONFIG_MESSAGE,
        ) from exc


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_tender(
    request: Request,
    file: UploadFile | None = File(default=None),
    current_user: UserResponse = Depends(get_current_user),
    service: UploadService = Depends(get_upload_service),
    usage_service: UsageService = Depends(get_pdf_upload_usage_service),
    settings: Settings = Depends(get_settings),
    limiter: RateLimitService = Depends(get_rate_limit_service),
) -> UploadResponse:
    check_rate_limit_for_user_or_ip(
        request=request,
        current_user=current_user,
        rule=UPLOAD_RATE_LIMIT,
        settings=settings,
        limiter=limiter,
    )

    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A PDF file is required.",
    )

    try:
        file_bytes = await file.read(MAX_PDF_UPLOAD_BYTES + 1)
        upload = service.create_pdf_upload(
            user_id=current_user.id,
            file_name=file.filename,
            mime_type=file.content_type,
            file_bytes=file_bytes,
            usage_service=usage_service,
            max_uploads_per_day=settings.max_uploads_per_day,
        )
    except InvalidPdfUploadError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except PdfUploadTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(exc),
        ) from exc
    except UploadQuotaExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=DAILY_UPLOAD_LIMIT_MESSAGE,
        ) from exc
    except RuntimeError as exc:
        detail = (
            PDF_UPLOAD_CONFIG_MESSAGE
            if str(exc) == PDF_UPLOAD_CONFIG_MESSAGE
            else PDF_UPLOAD_STORAGE_MESSAGE
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
        ) from exc
    finally:
        await file.close()

    record_audit_log(
        action="upload_pdf",
        user_id=current_user.id,
        resource_type="upload",
        resource_id=upload.upload_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        metadata={
            "tender_id": str(upload.tender_id),
            "file_name": upload.file_name,
            "file_size": upload.file_size,
            "mime_type": upload.mime_type,
            "storage_bucket": upload.storage_bucket,
            "storage_path": upload.storage_path,
        },
    )

    return upload
