from fastapi import Depends, HTTPException, status

from app.api.dependencies.auth import get_current_user
from app.schemas.auth import UserResponse
from app.services.usage_service import UsageService, get_usage_service

ANALYSIS_LIMIT_REACHED_MESSAGE = (
    "Free analysis limit reached. Please upgrade to continue."
)


def require_analysis_credit(
    current_user: UserResponse = Depends(get_current_user),
    usage_service: UsageService = Depends(get_usage_service),
) -> UserResponse:
    try:
        if not usage_service.can_run_ai_analysis(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=ANALYSIS_LIMIT_REACHED_MESSAGE,
            )
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return current_user
