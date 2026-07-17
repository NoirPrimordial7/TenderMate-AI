export type UsageCounts = {
  analysis_completed: number;
  pdf_upload_today?: number | null;
  total_events: number;
};

export type BillingUsage = {
  free_analysis_credits: number;
  upload_limit_per_day: number;
  plan_name: string;
  subscription_status: string;
  can_run_ai_analysis: boolean;
  usage_counts: UsageCounts;
};

export type BillingPlan = {
  id: string;
  name: string;
  price_label: string;
  analyses_included: number;
  uploads_per_day?: number | null;
  interval?: string | null;
  coming_soon: boolean;
  description: string;
};

export type BillingPlansResponse = {
  plans: BillingPlan[];
};

export type CheckoutResponse = {
  message: string;
  payments_enabled: boolean;
  checkout_url?: string | null;
};
