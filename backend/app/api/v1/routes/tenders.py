from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.rate_limit import (
    PDF_EXTRACT_RATE_LIMIT,
    check_rate_limit_for_user_or_ip,
    get_client_ip,
    get_user_agent,
)
from app.core.config import Settings, get_settings
from app.schemas.auth import UserResponse
from app.schemas.extraction import PDFExtractionResponse
from app.schemas.tender import TenderResponse
from app.services.audit_service import record_audit_log
from app.services.pdf_extraction_service import (
    PDFExtractionFailedError,
    PDFExtractionService,
    PDFUploadMissingError,
    TenderNotFoundError,
    get_pdf_extraction_service,
)
from app.services.rate_limit_service import RateLimitService, get_rate_limit_service
from app.services.tender_service import TenderService, get_tender_service
from app.services.usage_service import UsageService, get_usage_service

router = APIRouter(prefix="/tenders", tags=["tenders"])
PDF_EXTRACT_CONFIG_MESSAGE = "Supabase configuration is required for PDF extraction."
PDF_EXTRACT_FAILED_MESSAGE = "PDF text extraction failed. Please verify the PDF and try again."


def get_pdf_extract_usage_service() -> UsageService:
    try:
        return get_usage_service()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=PDF_EXTRACT_CONFIG_MESSAGE,
        ) from exc


@router.get("", response_model=list[TenderResponse])
def list_tenders(
    current_user: UserResponse = Depends(get_current_user),
    service: TenderService = Depends(get_tender_service),
) -> list[TenderResponse]:
    return service.list_tenders(user_id=current_user.id)


@router.get("/latest", response_model=TenderResponse)
def get_latest_tender(
    current_user: UserResponse = Depends(get_current_user),
    service: TenderService = Depends(get_tender_service),
) -> TenderResponse:
    latest_tender = service.get_latest_tender(user_id=current_user.id)

    if latest_tender is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tenders available for the current user.",
        )

    return latest_tender


@router.get("/{id}", response_model=TenderResponse)
def get_tender_by_id(
    id: UUID,
    current_user: UserResponse = Depends(get_current_user),
    service: TenderService = Depends(get_tender_service),
) -> TenderResponse:
    tender = service.get_tender_by_id(id, user_id=current_user.id)

    if tender is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {id} was not found or does not belong to the current user.",
        )

    return tender


@router.post("/{id}/extract", response_model=PDFExtractionResponse)
def extract_tender_pdf(
    id: UUID,
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    service: PDFExtractionService = Depends(get_pdf_extraction_service),
    usage_service: UsageService = Depends(get_pdf_extract_usage_service),
    settings: Settings = Depends(get_settings),
    limiter: RateLimitService = Depends(get_rate_limit_service),
) -> PDFExtractionResponse:
    check_rate_limit_for_user_or_ip(
        request=request,
        current_user=current_user,
        rule=PDF_EXTRACT_RATE_LIMIT,
        settings=settings,
        limiter=limiter,
    )

    try:
        result = service.extract_tender_pdf(
            tender_id=id,
            user_id=current_user.id,
            usage_service=usage_service,
        )
    except TenderNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except PDFUploadMissingError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except PDFExtractionFailedError as exc:
        record_audit_log(
            action="pdf_extract_failed",
            user_id=current_user.id,
            resource_type="tender",
            resource_id=id,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            metadata={"error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=PDF_EXTRACT_FAILED_MESSAGE,
        ) from exc
    except RuntimeError as exc:
        record_audit_log(
            action="pdf_extract_failed",
            user_id=current_user.id,
            resource_type="tender",
            resource_id=id,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            metadata={"error": "backend_unavailable"},
        )
        detail = (
            PDF_EXTRACT_CONFIG_MESSAGE
            if str(exc) == PDF_EXTRACT_CONFIG_MESSAGE
            else PDF_EXTRACT_FAILED_MESSAGE
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
        ) from exc

    record_audit_log(
        action="extract_pdf",
        user_id=current_user.id,
        resource_type="tender",
        resource_id=id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        metadata={
            "page_count": result.page_count,
            "pages_with_text": result.pages_with_text,
        },
    )

    return result
