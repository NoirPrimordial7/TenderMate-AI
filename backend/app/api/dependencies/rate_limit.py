from collections.abc import Callable

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
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    return request.client.host if request.client else "unknown"


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
