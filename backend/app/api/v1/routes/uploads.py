from fastapi import APIRouter, Depends, Request, status

from app.schemas.upload import UploadResponse
from app.services.tender_service import TenderService, get_tender_service

router = APIRouter(prefix="/tenders", tags=["uploads"])


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_tender(
    request: Request,
    service: TenderService = Depends(get_tender_service),
) -> UploadResponse:
    file_size = request.headers.get("content-length")

    return service.create_upload_placeholder(
        file_name=request.headers.get("x-file-name", "mock-tender.pdf"),
        file_size=int(file_size) if file_size and file_size.isdigit() else None,
        mime_type=request.headers.get("content-type"),
    )
