from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies.auth import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.tender import TenderResponse
from app.services.tender_service import TenderService, get_tender_service

router = APIRouter(prefix="/tenders", tags=["tenders"])


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
