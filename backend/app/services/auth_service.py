from uuid import UUID

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.repositories.auth_repository import AuthRepository
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse


class EmailAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InactiveUserError(Exception):
    pass


class AuthService:
    def __init__(self, repository: AuthRepository | None = None) -> None:
        self._repository = repository

    @property
    def repository(self) -> AuthRepository:
        if self._repository is None:
            self._repository = AuthRepository()

        return self._repository

    def signup(self, request: SignupRequest) -> TokenResponse:
        email = self._normalize_email(request.email)
        existing_user = self.repository.find_user_by_email(email)
        if existing_user is not None:
            raise EmailAlreadyExistsError("Email already exists.")

        user = self.repository.create_user(
            full_name=request.full_name.strip(),
            email=email,
            password_hash=hash_password(request.password),
        )
        return self._token_response(user)

    def login(self, request: LoginRequest) -> TokenResponse:
        email = self._normalize_email(request.email)
        user = self.repository.find_user_by_email(email)
        if user is None:
            raise InvalidCredentialsError("Invalid email or password.")

        if not verify_password(request.password, user["password_hash"]):
            raise InvalidCredentialsError("Invalid email or password.")

        if not user["is_active"]:
            raise InactiveUserError("User account is inactive.")

        return self._token_response(user)

    def get_current_user_from_token(self, token: str) -> UserResponse:
        try:
            payload = decode_access_token(token)
            user_id = UUID(str(payload.get("sub")))
        except (TypeError, ValueError):
            raise InvalidCredentialsError("Invalid or expired access token.") from None

        user = self.repository.find_user_by_id(user_id)
        if user is None:
            raise InvalidCredentialsError("Invalid or expired access token.")

        if not user["is_active"]:
            raise InactiveUserError("User account is inactive.")

        return self._user_response(user)

    def _token_response(self, user: dict) -> TokenResponse:
        response_user = self._user_response(user)
        access_token = create_access_token(
            user_id=response_user.id,
            email=response_user.email,
            role=response_user.role,
        )

        return TokenResponse(access_token=access_token, user=response_user)

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    @staticmethod
    def _user_response(user: dict) -> UserResponse:
        return UserResponse(**user)


def get_auth_service() -> AuthService:
    return AuthService()
