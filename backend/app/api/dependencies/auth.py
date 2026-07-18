from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas.auth import UserResponse
from app.core.security import decode_access_token
from app.services.auth_service import (
    AccountLockedError,
    AuthService,
    InactiveUserError,
    InvalidCredentialsError,
    get_auth_service,
)

bearer_scheme = HTTPBearer(auto_error=False)
SERVICE_UNAVAILABLE_MESSAGE = "Backend temporarily unavailable. Please try again in a moment."


@dataclass(frozen=True)
class AuthenticatedSession:
    user: UserResponse
    session_id: UUID


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return service.get_current_user_from_token(credentials.credentials)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
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


def get_current_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    service: AuthService = Depends(get_auth_service),
) -> AuthenticatedSession:
    user = get_current_user(credentials, service)
    try:
        payload = decode_access_token(credentials.credentials if credentials else "")
        session_id = UUID(str(payload.get("sid")))
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    return AuthenticatedSession(user=user, session_id=session_id)
