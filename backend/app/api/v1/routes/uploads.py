from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status

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
from app.services.tender_service import TenderService, get_tender_service
from app.services.usage_service import UsageService, get_usage_service

router = APIRouter(prefix="/tenders", tags=["uploads"])
DAILY_UPLOAD_LIMIT_MESSAGE = "Daily upload limit reached. Please try again tomorrow."
SERVICE_UNAVAILABLE_MESSAGE = "Backend temporarily unavailable. Please try again in a moment."


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_tender(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    service: TenderService = Depends(get_tender_service),
    usage_service: UsageService = Depends(get_usage_service),
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

    start_of_day = datetime.now(timezone.utc).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    try:
        upload_count = usage_service.count_usage_events(
            user_id=current_user.id,
            event_type="pdf_upload",
            since_datetime=start_of_day,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=SERVICE_UNAVAILABLE_MESSAGE,
        ) from exc

    if upload_count >= settings.max_uploads_per_day:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=DAILY_UPLOAD_LIMIT_MESSAGE,
        )

    file_size = request.headers.get("content-length")
    file_name = request.headers.get("x-file-name", "mock-tender.pdf")
    mime_type = request.headers.get("content-type")

    try:
        upload = service.create_upload_placeholder(
            file_name=file_name,
            file_size=int(file_size) if file_size and file_size.isdigit() else None,
            mime_type=mime_type,
            user_id=current_user.id,
        )
        usage_service.record_usage_event(
            user_id=current_user.id,
            event_type="pdf_upload",
            resource_id=upload.id,
            metadata={
                "file_name": file_name,
                "file_size": int(file_size) if file_size and file_size.isdigit() else None,
                "mime_type": mime_type,
            },
        )
        record_audit_log(
            action="tender_upload_placeholder",
            user_id=current_user.id,
            resource_type="upload",
            resource_id=upload.id,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            metadata={"file_name": file_name, "mime_type": mime_type},
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=SERVICE_UNAVAILABLE_MESSAGE,
        ) from exc

    return upload
