from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies.auth import bearer_scheme, get_current_user
from app.api.dependencies.rate_limit import (
    ANONYMOUS_FEEDBACK_RATE_LIMIT,
    AUTHENTICATED_FEEDBACK_RATE_LIMIT,
    LEGAL_ACCEPTANCE_RATE_LIMIT,
    check_rate_limit_for_user_or_ip,
    get_client_ip,
)
from app.core.config import Settings, get_settings
from app.schemas.auth import UserResponse
from app.schemas.launch import (
    LegalAcceptanceRequest,
    LegalAcceptanceStatus,
    ProductFeedbackCreate,
    ProductFeedbackResponse,
    TrainingConsentRequest,
    TrainingConsentResponse,
)
from app.services.audit_service import record_audit_log
from app.services.auth_service import (
    AccountLockedError,
    AuthService,
    InactiveUserError,
    InvalidCredentialsError,
    get_auth_service,
)
from app.services.launch_service import FeedbackOwnershipError, LaunchService, get_launch_service
from app.services.rate_limit_service import RateLimitService, get_rate_limit_service

router = APIRouter(tags=["launch"])


def optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    auth_service: AuthService = Depends(get_auth_service),
) -> UserResponse | None:
    if credentials is None:
        return None
    try:
        return auth_service.get_current_user_from_token(credentials.credentials)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc), headers={"WWW-Authenticate": "Bearer"}) from exc
    except InactiveUserError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except AccountLockedError as exc:
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Backend temporarily unavailable. Please try again in a moment.") from exc


@router.get("/legal/acceptance", response_model=LegalAcceptanceStatus)
def legal_acceptance_status(
    current_user: UserResponse = Depends(get_current_user),
    service: LaunchService = Depends(get_launch_service),
) -> LegalAcceptanceStatus:
    return service.acceptance_status(current_user.id)


@router.post("/legal/acceptance", response_model=LegalAcceptanceStatus)
def accept_legal_documents(
    request: Request,
    payload: LegalAcceptanceRequest,
    current_user: UserResponse = Depends(get_current_user),
    service: LaunchService = Depends(get_launch_service),
    settings: Settings = Depends(get_settings),
    limiter: RateLimitService = Depends(get_rate_limit_service),
) -> LegalAcceptanceStatus:
    check_rate_limit_for_user_or_ip(request=request, current_user=current_user, rule=LEGAL_ACCEPTANCE_RATE_LIMIT, settings=settings, limiter=limiter)
    try:
        response = service.accept_current_documents(current_user.id, payload.locale, payload.accepted)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    record_audit_log(action="legal_documents_accepted", user_id=current_user.id, metadata={"locale": payload.locale, "version": response.version})
    return response


@router.get("/preferences/training-consent", response_model=TrainingConsentResponse)
def get_training_consent(
    current_user: UserResponse = Depends(get_current_user),
    service: LaunchService = Depends(get_launch_service),
) -> TrainingConsentResponse:
    return TrainingConsentResponse(allowed=service.repository.get_training_consent(current_user.id))


@router.patch("/preferences/training-consent", response_model=TrainingConsentResponse)
def update_training_consent(
    payload: TrainingConsentRequest,
    current_user: UserResponse = Depends(get_current_user),
    service: LaunchService = Depends(get_launch_service),
) -> TrainingConsentResponse:
    service.repository.set_training_consent(current_user.id, payload.allowed)
    record_audit_log(action="training_consent_updated", user_id=current_user.id, metadata={"allowed": payload.allowed})
    return TrainingConsentResponse(allowed=payload.allowed)


@router.post("/feedback", response_model=ProductFeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_product_feedback(
    request: Request,
    payload: ProductFeedbackCreate,
    current_user: UserResponse | None = Depends(optional_current_user),
    service: LaunchService = Depends(get_launch_service),
    settings: Settings = Depends(get_settings),
    limiter: RateLimitService = Depends(get_rate_limit_service),
) -> ProductFeedbackResponse:
    rule = AUTHENTICATED_FEEDBACK_RATE_LIMIT if current_user else ANONYMOUS_FEEDBACK_RATE_LIMIT
    check_rate_limit_for_user_or_ip(request=request, current_user=current_user, rule=rule, settings=settings, limiter=limiter)
    try:
        response = service.record_feedback(payload, current_user.id if current_user else None)
    except FeedbackOwnershipError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    record_audit_log(action="product_feedback_created", user_id=current_user.id if current_user else None, ip_address=get_client_ip(request), metadata={"category": payload.category, "locale": payload.locale, "page_path": payload.page_path})
    return response


@router.get("/feedback", response_model=list[ProductFeedbackResponse])
def list_own_feedback(
    current_user: UserResponse = Depends(get_current_user),
    service: LaunchService = Depends(get_launch_service),
) -> list[ProductFeedbackResponse]:
    return [ProductFeedbackResponse(**row) for row in service.repository.list_feedback(current_user.id)]
