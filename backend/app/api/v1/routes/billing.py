from fastapi import APIRouter, Body, Depends, HTTPException, Request, status

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.rate_limit import (
    BILLING_USAGE_RATE_LIMIT,
    CHECKOUT_RATE_LIMIT,
    check_rate_limit_for_user_or_ip,
    get_client_ip,
    get_user_agent,
)
from app.core.config import Settings, get_settings
from app.schemas.auth import UserResponse
from app.schemas.billing import (
    BillingPlan,
    BillingPlansResponse,
    BillingUsageResponse,
    CheckoutRequest,
    CheckoutResponse,
)
from app.services.audit_service import record_audit_log
from app.services.rate_limit_service import RateLimitService, get_rate_limit_service
from app.services.usage_service import UsageService, get_usage_service

router = APIRouter(prefix="/billing", tags=["billing"])
SERVICE_UNAVAILABLE_MESSAGE = "Backend temporarily unavailable. Please try again in a moment."

MVP_PLANS = [
    BillingPlan(
        id="free",
        name="Free",
        price_label="₹0",
        analyses_included=15,
        interval=None,
        coming_soon=False,
        description="15 AI tender analyses included for every new user.",
    ),
    BillingPlan(
        id="starter",
        name="Starter",
        price_label="₹199/month",
        analyses_included=25,
        interval="month",
        coming_soon=True,
        description="25 AI tender analyses per month. Coming soon.",
    ),
    BillingPlan(
        id="pro",
        name="Pro",
        price_label="₹499/month",
        analyses_included=100,
        interval="month",
        coming_soon=True,
        description="100 AI tender analyses per month. Coming soon.",
    ),
    BillingPlan(
        id="business",
        name="Business",
        price_label="₹999/month",
        analyses_included=300,
        interval="month",
        coming_soon=True,
        description="300 AI tender analyses per month. Coming soon.",
    ),
]


@router.get("/usage", response_model=BillingUsageResponse)
def get_usage(
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    usage_service: UsageService = Depends(get_usage_service),
    settings: Settings = Depends(get_settings),
    limiter: RateLimitService = Depends(get_rate_limit_service),
) -> BillingUsageResponse:
    check_rate_limit_for_user_or_ip(
        request=request,
        current_user=current_user,
        rule=BILLING_USAGE_RATE_LIMIT,
        settings=settings,
        limiter=limiter,
    )
    try:
        response = BillingUsageResponse(
            **usage_service.get_user_usage_summary(current_user.id)
        )
        record_audit_log(
            action="billing_usage_view",
            user_id=current_user.id,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
        return response
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=SERVICE_UNAVAILABLE_MESSAGE,
        ) from exc


@router.get("/plans", response_model=BillingPlansResponse)
def get_plans(
    current_user: UserResponse = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> BillingPlansResponse:
    _ = current_user
    plans = [
        plan.copy(
            update={
                "analyses_included": settings.free_analysis_credits_default,
                "description": (
                    f"{settings.free_analysis_credits_default} AI tender analyses "
                    "included for every new user."
                ),
            }
        )
        if plan.id == "free"
        else plan
        for plan in MVP_PLANS
    ]
    return BillingPlansResponse(plans=plans)


@router.post("/create-checkout", response_model=CheckoutResponse)
def create_checkout(
    request_context: Request,
    request: CheckoutRequest | None = Body(default=None),
    current_user: UserResponse = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    limiter: RateLimitService = Depends(get_rate_limit_service),
) -> CheckoutResponse:
    check_rate_limit_for_user_or_ip(
        request=request_context,
        current_user=current_user,
        rule=CHECKOUT_RATE_LIMIT,
        settings=settings,
        limiter=limiter,
    )
    record_audit_log(
        action="checkout_placeholder",
        user_id=current_user.id,
        ip_address=get_client_ip(request_context),
        user_agent=get_user_agent(request_context),
        metadata={"plan_id": request.plan_id if request else None},
    )
    _ = request
    _ = current_user
    return CheckoutResponse(
        message="Payments are coming soon. Your free trial is active.",
        payments_enabled=False,
        checkout_url=None,
    )
