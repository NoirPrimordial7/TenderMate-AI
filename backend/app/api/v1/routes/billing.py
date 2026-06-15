from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.api.dependencies.auth import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.billing import (
    BillingPlan,
    BillingPlansResponse,
    BillingUsageResponse,
    CheckoutRequest,
    CheckoutResponse,
)
from app.services.usage_service import UsageService, get_usage_service

router = APIRouter(prefix="/billing", tags=["billing"])

MVP_PLANS = [
    BillingPlan(
        id="free",
        name="Free",
        price_label="₹0",
        analyses_included=5,
        interval=None,
        coming_soon=False,
        description="5 AI tender analyses included for every new user.",
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
    current_user: UserResponse = Depends(get_current_user),
    usage_service: UsageService = Depends(get_usage_service),
) -> BillingUsageResponse:
    try:
        return BillingUsageResponse(
            **usage_service.get_user_usage_summary(current_user.id)
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.get("/plans", response_model=BillingPlansResponse)
def get_plans(
    current_user: UserResponse = Depends(get_current_user),
) -> BillingPlansResponse:
    _ = current_user
    return BillingPlansResponse(plans=MVP_PLANS)


@router.post("/create-checkout", response_model=CheckoutResponse)
def create_checkout(
    request: CheckoutRequest | None = Body(default=None),
    current_user: UserResponse = Depends(get_current_user),
) -> CheckoutResponse:
    _ = request
    _ = current_user
    return CheckoutResponse(
        message="Payments are coming soon. Your free trial is active.",
        payments_enabled=False,
        checkout_url=None,
    )
