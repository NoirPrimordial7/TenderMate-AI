from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.rate_limit import (
    AUTH_ME_RATE_LIMIT,
    LOGIN_RATE_LIMIT,
    SIGNUP_RATE_LIMIT,
    check_rate_limit_for_user_or_ip,
    get_client_ip,
    get_user_agent,
    rate_limit_by_ip,
)
from app.core.config import Settings, get_settings
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserPreferencesUpdate, UserResponse
from app.services.audit_service import record_audit_log
from app.services.auth_service import (
    AccountLockedError,
    AuthService,
    EmailAlreadyExistsError,
    InactiveUserError,
    InvalidCredentialsError,
    get_auth_service,
)
from app.services.rate_limit_service import RateLimitService, get_rate_limit_service

router = APIRouter(prefix="/auth", tags=["auth"])
SERVICE_UNAVAILABLE_MESSAGE = "Backend temporarily unavailable. Please try again in a moment."


@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_by_ip(SIGNUP_RATE_LIMIT))],
)
def signup(
    request: Request,
    payload: SignupRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    try:
        return service.signup(
            payload,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
    except EmailAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=SERVICE_UNAVAILABLE_MESSAGE,
        ) from exc


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit_by_ip(LOGIN_RATE_LIMIT))],
)
def login(
    request: Request,
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    try:
        return service.login(
            payload,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    except InactiveUserError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except AccountLockedError as exc:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=SERVICE_UNAVAILABLE_MESSAGE,
        ) from exc


@router.get(
    "/me",
    response_model=UserResponse,
    dependencies=[Depends(rate_limit_by_ip(AUTH_ME_RATE_LIMIT))],
)
def me(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    limiter: RateLimitService = Depends(get_rate_limit_service),
) -> UserResponse:
    check_rate_limit_for_user_or_ip(
        request=request,
        current_user=current_user,
        rule=AUTH_ME_RATE_LIMIT,
        settings=settings,
        limiter=limiter,
    )
    record_audit_log(
        action="auth_me_access",
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    return current_user


@router.patch("/preferences", response_model=UserResponse)
def update_preferences(
    request: Request,
    payload: UserPreferencesUpdate,
    current_user: UserResponse = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    updated_user = service.update_preferences(current_user.id, payload)
    record_audit_log(
        action="language_preferences_updated",
        user_id=current_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        metadata=payload.model_dump(exclude_none=True),
    )
    return updated_user
