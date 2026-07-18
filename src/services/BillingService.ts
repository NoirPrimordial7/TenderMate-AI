import { BillingPlansResponse, BillingUsage, CheckoutResponse } from "@/domain/billing/types";
import { apiRequest } from "@/services/api";

export function getUsage(options: { signal?: AbortSignal; userId?: string } = {}) {
  return apiRequest<BillingUsage>("/billing/usage", { signal: options.signal, conditionalKey: options.userId ? `${options.userId}:billing-usage` : undefined });
}

export function getPlans() {
  return apiRequest<BillingPlansResponse>("/billing/plans");
}

export function createCheckout(planId?: string) {
  return apiRequest<CheckoutResponse>("/billing/create-checkout", {
    method: "POST",
    body: planId ? { plan_id: planId } : {}
  });
}

export const billingService = {
  getUsage,
  getPlans,
  createCheckout
};
