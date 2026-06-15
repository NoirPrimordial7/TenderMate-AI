"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { BillingPlan, BillingUsage } from "@/domain/billing/types";
import { billingService } from "@/services/BillingService";
import { toFriendlyApiMessage } from "@/services/api";

const fallbackPlans: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    price_label: "₹0",
    analyses_included: 5,
    interval: null,
    coming_soon: false,
    description: "5 AI tender analyses included for every new user."
  },
  {
    id: "starter",
    name: "Starter",
    price_label: "₹199/month",
    analyses_included: 25,
    interval: "month",
    coming_soon: true,
    description: "25 AI tender analyses per month. Coming soon."
  },
  {
    id: "pro",
    name: "Pro",
    price_label: "₹499/month",
    analyses_included: 100,
    interval: "month",
    coming_soon: true,
    description: "100 AI tender analyses per month. Coming soon."
  },
  {
    id: "business",
    name: "Business",
    price_label: "₹999/month",
    analyses_included: 300,
    interval: "month",
    coming_soon: true,
    description: "300 AI tender analyses per month. Coming soon."
  }
];

export default function PricingPage() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>(fallbackPlans);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);

  const currentPlan = usage?.plan_name ?? user?.plan_name ?? "free";
  const freeCredits = Math.max(0, usage?.free_analysis_credits ?? user?.free_analysis_credits ?? 5);
  const subscriptionStatus = usage?.subscription_status ?? user?.subscription_status ?? "trial";

  const currentPlanLabel = useMemo(
    () => plans.find((plan) => plan.id === currentPlan)?.name ?? currentPlan,
    [currentPlan, plans]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setPlans(fallbackPlans);
      setUsage(null);
      setError("");
      return;
    }

    let isMounted = true;
    setError("");

    Promise.all([billingService.getPlans(), billingService.getUsage()])
      .then(([plansResponse, usageResponse]) => {
        if (!isMounted) return;
        setPlans(plansResponse.plans);
        setUsage(usageResponse);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setPlans(fallbackPlans);
        setError(toFriendlyApiMessage(loadError, "Could not refresh billing details."));
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleUpgrade = async (planId: string) => {
    if (!isAuthenticated) return;

    setCheckoutPlanId(planId);
    setStatusMessage("");
    setError("");

    try {
      const response = await billingService.createCheckout(planId);
      setStatusMessage(response.message);
    } catch (checkoutError) {
      setError(toFriendlyApiMessage(checkoutError, "Payments are coming soon. Please try again later."));
    } finally {
      setCheckoutPlanId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="muted-label">Pricing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
            Start with 5 free AI tender analyses
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Payments are not enabled yet. The billing foundation is ready for trial limits and future Razorpay checkout.
          </p>
        </div>

        {!isAuthLoading && isAuthenticated ? (
          <div className="mt-6 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current plan</p>
              <p className="mt-1 text-lg font-semibold capitalize text-gray-950">{currentPlanLabel}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Credits left</p>
              <p className="mt-1 text-lg font-semibold text-gray-950">{freeCredits}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Subscription</p>
              <p className="mt-1 text-lg font-semibold capitalize text-gray-950">{subscriptionStatus}</p>
            </div>
          </div>
        ) : null}

        {statusMessage ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {statusMessage}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isCheckingOut = checkoutPlanId === plan.id;

            return (
              <article key={plan.id} className="card flex min-h-[24rem] flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-gray-950">{plan.name}</h2>
                    <p className="mt-2 text-3xl font-semibold text-gray-950">{plan.price_label}</p>
                  </div>
                  {plan.coming_soon ? (
                    <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
                      Coming soon
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-6 text-gray-600">{plan.description}</p>
                <ul className="mt-6 space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
                    <span>{plan.analyses_included} AI analyses included</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
                    <span>Protected tender history stays available</span>
                  </li>
                </ul>

                <div className="mt-auto pt-6">
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isCheckingOut || isCurrentPlan}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {isCheckingOut ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                      {isCurrentPlan ? "Current plan" : "Upgrade"}
                    </button>
                  ) : (
                    <Link
                      href="/login?next=/pricing"
                      className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black"
                    >
                      Login to upgrade
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
