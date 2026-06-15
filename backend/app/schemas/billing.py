from pydantic import BaseModel


class UsageCounts(BaseModel):
    analysis_completed: int
    pdf_upload_today: int | None = None
    total_events: int


class BillingUsageResponse(BaseModel):
    free_analysis_credits: int
    plan_name: str
    subscription_status: str
    can_run_ai_analysis: bool
    usage_counts: UsageCounts


class BillingPlan(BaseModel):
    id: str
    name: str
    price_label: str
    analyses_included: int
    interval: str | None = None
    coming_soon: bool
    description: str


class BillingPlansResponse(BaseModel):
    plans: list[BillingPlan]


class CheckoutRequest(BaseModel):
    plan_id: str | None = None


class CheckoutResponse(BaseModel):
    message: str
    payments_enabled: bool
    checkout_url: str | None = None
