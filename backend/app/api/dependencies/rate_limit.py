from collections.abc import Callable
import ipaddress

from fastapi import Depends, HTTPException, Request, status

from app.core.config import Settings, get_settings
from app.schemas.auth import UserResponse
from app.services.rate_limit_service import (
    RateLimitExceededError,
    RateLimitRule,
    RateLimitService,
    get_rate_limit_service,
)

RATE_LIMIT_MESSAGE = "Too many requests. Please try again later."


def get_client_ip(request: Request) -> str:
    peer_ip = request.client.host if request.client else "unknown"
    settings = get_settings()
    try:
        peer_address = ipaddress.ip_address(peer_ip)
        trusted_proxy = any(
            peer_address in ipaddress.ip_network(cidr, strict=False)
            for cidr in settings.trusted_proxy_cidrs
        )
    except ValueError:
        trusted_proxy = False

    if trusted_proxy:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            candidate = forwarded_for.split(",", 1)[0].strip()
            try:
                return str(ipaddress.ip_address(candidate))
            except ValueError:
                pass
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            try:
                return str(ipaddress.ip_address(real_ip.strip()))
            except ValueError:
                pass

    return peer_ip


def get_user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


def rate_limit_by_ip(rule: RateLimitRule) -> Callable[..., None]:
    def dependency(
        request: Request,
        settings: Settings = Depends(get_settings),
        limiter: RateLimitService = Depends(get_rate_limit_service),
    ) -> None:
        if not settings.rate_limit_enabled:
            return

        _check_rate_limit(limiter, get_client_ip(request), rule)

    return dependency


def check_rate_limit_for_user_or_ip(
    request: Request,
    current_user: UserResponse,
    rule: RateLimitRule,
    settings: Settings,
    limiter: RateLimitService,
) -> None:
    if not settings.rate_limit_enabled:
        return

    identifier = f"user:{current_user.id}" if current_user else f"ip:{get_client_ip(request)}"
    _check_rate_limit(limiter, identifier, rule)


def _check_rate_limit(
    limiter: RateLimitService,
    identifier: str,
    rule: RateLimitRule,
) -> None:
    try:
        limiter.check(identifier, rule)
    except RateLimitExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=RATE_LIMIT_MESSAGE,
        ) from exc


SIGNUP_RATE_LIMIT = RateLimitRule(
    name="auth_signup",
    max_requests=5,
    window_seconds=60 * 60,
)
LOGIN_RATE_LIMIT = RateLimitRule(
    name="auth_login",
    max_requests=10,
    window_seconds=15 * 60,
)
AUTH_ME_RATE_LIMIT = RateLimitRule(
    name="auth_me",
    max_requests=120,
    window_seconds=60,
)
UPLOAD_RATE_LIMIT = RateLimitRule(
    name="tender_upload",
    max_requests=10,
    window_seconds=60 * 60,
)
PDF_EXTRACT_RATE_LIMIT = RateLimitRule(
    name="pdf_extract",
    max_requests=10,
    window_seconds=60 * 60,
)
SOURCE_PDF_RATE_LIMIT = RateLimitRule(
    name="source_pdf",
    max_requests=60,
    window_seconds=60 * 60,
)
AI_ANALYSIS_RATE_LIMIT = RateLimitRule(
    name="ai_analysis",
    max_requests=10,
    window_seconds=60 * 60,
)

# Compatibility alias for older imports.
GEMINI_ANALYSIS_RATE_LIMIT = AI_ANALYSIS_RATE_LIMIT
TENDER_QUESTION_RATE_LIMIT = RateLimitRule(
    name="tender_question",
    max_requests=10,
    window_seconds=60,
)
BILLING_USAGE_RATE_LIMIT = RateLimitRule(
    name="billing_usage",
    max_requests=120,
    window_seconds=60,
)
CHECKOUT_RATE_LIMIT = RateLimitRule(
    name="billing_checkout",
    max_requests=5,
    window_seconds=60 * 60,
)
ANONYMOUS_FEEDBACK_RATE_LIMIT = RateLimitRule(
    name="anonymous_feedback",
    max_requests=3,
    window_seconds=60 * 60,
)
AUTHENTICATED_FEEDBACK_RATE_LIMIT = RateLimitRule(
    name="authenticated_feedback",
    max_requests=10,
    window_seconds=60 * 60,
)
LEGAL_ACCEPTANCE_RATE_LIMIT = RateLimitRule(
    name="legal_acceptance",
    max_requests=20,
    window_seconds=60 * 60,
)
MFA_CHALLENGE_RATE_LIMIT = RateLimitRule(
    name="auth_mfa_challenge",
    max_requests=10,
    window_seconds=10 * 60,
)
SECURITY_MUTATION_RATE_LIMIT = RateLimitRule(
    name="account_security_mutation",
    max_requests=20,
    window_seconds=60 * 60,
)
SECURITY_READ_RATE_LIMIT = RateLimitRule(
    name="account_security_read",
    max_requests=120,
    window_seconds=60,
)
PASSWORD_RESET_RATE_LIMIT = RateLimitRule(
    name="password_reset",
    max_requests=5,
    window_seconds=60 * 60,
)
