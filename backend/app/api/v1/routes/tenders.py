from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.tender import TenderResponse
from app.services.tender_service import TenderService, get_tender_service

router = APIRouter(prefix="/tenders", tags=["tenders"])


@router.get("", response_model=list[TenderResponse])
def list_tenders(
    service: TenderService = Depends(get_tender_service),
) -> list[TenderResponse]:
    return service.list_tenders()


@router.get("/latest", response_model=TenderResponse)
def get_latest_tender(
    service: TenderService = Depends(get_tender_service),
) -> TenderResponse:
    latest_tender = service.get_latest_tender()

    if latest_tender is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tenders available.",
        )

    return latest_tender


@router.get("/{id}", response_model=TenderResponse)
def get_tender_by_id(
    id: UUID,
    service: TenderService = Depends(get_tender_service),
) -> TenderResponse:
    tender = service.get_tender_by_id(id)

    if tender is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender {id} was not found.",
        )

    return tender
