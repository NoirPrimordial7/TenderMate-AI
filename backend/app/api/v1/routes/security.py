import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.dependencies.auth import AuthenticatedSession, get_current_session
from app.api.dependencies.rate_limit import (
    MFA_CHALLENGE_RATE_LIMIT,
    PASSWORD_RESET_RATE_LIMIT,
    SECURITY_MUTATION_RATE_LIMIT,
    SECURITY_READ_RATE_LIMIT,
    get_client_ip,
    get_user_agent,
    rate_limit_by_ip,
)
from app.schemas.auth import TokenResponse
from app.schemas.security import (
    MfaChallengeRequest,
    MfaConfirmRequest,
    MfaSetupResponse,
    PasswordChangeRequest,
    PasswordResetAcceptedResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    PasswordVerificationRequest,
    RecoveryCodesResponse,
    SecurityEventResponse,
    SecurityStatusResponse,
    SessionResponse,
)
from app.services.account_security_service import (
    AccountSecurityService,
    RecentLoginRequiredError,
    SecurityVerificationError,
    TurnstileVerificationError,
    get_account_security_service,
)

router = APIRouter(prefix="/auth", tags=["account-security"])
logger = logging.getLogger(__name__)


def _security_error(exc: Exception) -> HTTPException:
    if isinstance(exc, RecentLoginRequiredError):
        return HTTPException(status_code=status.HTTP_428_PRECONDITION_REQUIRED, detail=str(exc))
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))


@router.post(
    "/mfa/challenge",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit_by_ip(MFA_CHALLENGE_RATE_LIMIT))],
)
def complete_mfa_challenge(
    request: Request,
    payload: MfaChallengeRequest,
    service: AccountSecurityService = Depends(get_account_security_service),
) -> TokenResponse:
    try:
        return service.complete_mfa_challenge(
            payload.challenge_token,
            payload.code,
            payload.recovery_code,
            get_client_ip(request),
            get_user_agent(request),
        )
    except SecurityVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.get(
    "/security/status",
    response_model=SecurityStatusResponse,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_READ_RATE_LIMIT))],
)
def security_status(
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> SecurityStatusResponse:
    return service.status(current.user, current.session_id)


@router.post(
    "/security/verify-recent",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_MUTATION_RATE_LIMIT))],
)
def verify_recent_login(
    payload: PasswordVerificationRequest,
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> Response:
    try:
        service.verify_recent_login(current.user, current.session_id, payload.password, payload.code)
    except SecurityVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/security/mfa/setup",
    response_model=MfaSetupResponse,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_MUTATION_RATE_LIMIT))],
)
def start_mfa_setup(
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> MfaSetupResponse:
    try:
        service.require_recent_login(current.user.id, current.session_id)
        secret, uri = service.start_mfa_setup(current.user)
        return MfaSetupResponse(secret=secret, otpauth_uri=uri)
    except (RecentLoginRequiredError, SecurityVerificationError) as exc:
        raise _security_error(exc) from exc


@router.post(
    "/security/mfa/confirm",
    response_model=RecoveryCodesResponse,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_MUTATION_RATE_LIMIT))],
)
def confirm_mfa(
    request: Request,
    payload: MfaConfirmRequest,
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> RecoveryCodesResponse:
    try:
        service.require_recent_login(current.user.id, current.session_id)
        codes = service.confirm_mfa(current.user, current.session_id, payload.code, get_client_ip(request), get_user_agent(request))
        return RecoveryCodesResponse(recovery_codes=codes)
    except (RecentLoginRequiredError, SecurityVerificationError) as exc:
        raise _security_error(exc) from exc


@router.delete(
    "/security/mfa/setup",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_MUTATION_RATE_LIMIT))],
)
def cancel_mfa_setup(
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> Response:
    try:
        service.require_recent_login(current.user.id, current.session_id)
        service.cancel_mfa_setup(current.user)
    except (RecentLoginRequiredError, SecurityVerificationError) as exc:
        raise _security_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/security/mfa",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_MUTATION_RATE_LIMIT))],
)
def disable_mfa(
    request: Request,
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> Response:
    try:
        service.disable_mfa(current.user, current.session_id, get_client_ip(request), get_user_agent(request))
    except (RecentLoginRequiredError, SecurityVerificationError) as exc:
        raise _security_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/security/mfa/recovery-codes",
    response_model=RecoveryCodesResponse,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_MUTATION_RATE_LIMIT))],
)
def regenerate_recovery_codes(
    request: Request,
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> RecoveryCodesResponse:
    try:
        codes = service.regenerate_recovery_codes(current.user, current.session_id, get_client_ip(request), get_user_agent(request))
        return RecoveryCodesResponse(recovery_codes=codes)
    except (RecentLoginRequiredError, SecurityVerificationError) as exc:
        raise _security_error(exc) from exc


@router.get(
    "/security/sessions",
    response_model=list[SessionResponse],
    dependencies=[Depends(rate_limit_by_ip(SECURITY_READ_RATE_LIMIT))],
)
def list_sessions(
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> list[SessionResponse]:
    return service.list_sessions(current.user, current.session_id)


@router.delete(
    "/security/sessions/by-id/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_MUTATION_RATE_LIMIT))],
)
def revoke_session(
    session_id: UUID,
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> Response:
    service.repository.revoke_session(session_id, current.user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/security/sessions/revoke-current",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_MUTATION_RATE_LIMIT))],
)
def revoke_current_session(
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> Response:
    service.repository.revoke_session(current.session_id, current.user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/security/sessions/revoke-others",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_MUTATION_RATE_LIMIT))],
)
def revoke_other_sessions(
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> Response:
    service.repository.revoke_sessions(current.user.id, except_session_id=current.session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/security/sessions/revoke-all",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_MUTATION_RATE_LIMIT))],
)
def revoke_all_sessions(
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> Response:
    service.repository.revoke_sessions(current.user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/security/activity",
    response_model=list[SecurityEventResponse],
    dependencies=[Depends(rate_limit_by_ip(SECURITY_READ_RATE_LIMIT))],
)
def security_activity(
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> list[SecurityEventResponse]:
    return service.list_events(current.user.id)


@router.post(
    "/security/password/change",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_by_ip(SECURITY_MUTATION_RATE_LIMIT))],
)
def change_password(
    request: Request,
    payload: PasswordChangeRequest,
    current: AuthenticatedSession = Depends(get_current_session),
    service: AccountSecurityService = Depends(get_account_security_service),
) -> Response:
    try:
        service.change_password(current.user, current.session_id, payload.current_password, payload.new_password, payload.mfa_code, get_client_ip(request), get_user_agent(request))
    except (RecentLoginRequiredError, SecurityVerificationError) as exc:
        raise _security_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/password-reset/request",
    response_model=PasswordResetAcceptedResponse,
    dependencies=[Depends(rate_limit_by_ip(PASSWORD_RESET_RATE_LIMIT))],
)
def request_password_reset(
    request: Request,
    payload: PasswordResetRequest,
    service: AccountSecurityService = Depends(get_account_security_service),
) -> PasswordResetAcceptedResponse:
    try:
        service.verify_turnstile(payload.turnstile_token, get_client_ip(request), "password-reset")
    except TurnstileVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    try:
        service.request_password_reset(payload.email, get_client_ip(request), get_user_agent(request))
    except RuntimeError:
        # Preserve the same public response for known and unknown accounts. The
        # operational failure is logged without including the email or token.
        logger.error("Password reset request could not be queued.")
    return PasswordResetAcceptedResponse()


@router.post(
    "/password-reset/confirm",
    response_model=PasswordResetAcceptedResponse,
    dependencies=[Depends(rate_limit_by_ip(PASSWORD_RESET_RATE_LIMIT))],
)
def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    service: AccountSecurityService = Depends(get_account_security_service),
) -> PasswordResetAcceptedResponse:
    try:
        service.confirm_password_reset(payload.token, payload.new_password)
    except SecurityVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return PasswordResetAcceptedResponse()
