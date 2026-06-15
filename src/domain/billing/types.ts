export type UsageCounts = {
  analysis_completed: number;
  total_events: number;
};

export type BillingUsage = {
  free_analysis_credits: number;
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
