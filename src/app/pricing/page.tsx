"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { BillingUsage } from "@/domain/billing/types";
import { billingService } from "@/services/BillingService";
import { toFriendlyApiMessage } from "@/services/api";
import { useTranslations } from "@/contexts/LocaleContext";

export default function PricingPage() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const t = useTranslations("pricing");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const { data: plansResponse, error: plansError } = useSWR(["public", "billing-plans"], billingService.getPlans);
  const { data: usage, error: usageError } = useSWR<BillingUsage>(
    isAuthenticated && user ? ["private", user.id, "billing-usage"] : null,
    billingService.getUsage
  );
  const plans = plansResponse?.plans ?? [];

  const currentPlan = usage?.plan_name ?? user?.plan_name ?? "free";
  const creditValue = usage?.free_analysis_credits ?? user?.free_analysis_credits;
  const creditsLeft = typeof creditValue === "number" ? Math.max(0, creditValue) : null;
  const subscriptionStatus = usage?.subscription_status ?? user?.subscription_status ?? "trial";

  const currentPlanLabel = useMemo(
    () => plans.find((plan) => plan.id === currentPlan)?.name ?? currentPlan,
    [currentPlan, plans]
  );

  const loadError = plansError ?? usageError;
  const visibleError = error || (loadError ? toFriendlyApiMessage(loadError, "Could not refresh billing details.") : "");

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
        <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-end">
          <div className="max-w-3xl">
            <p className="muted-label">{t("eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {t("support")}
            </p>
          </div>

          {!isAuthLoading && isAuthenticated ? (
            <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-950 text-white">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("yourPlan")}</p>
                  <p className="mt-1 text-lg font-semibold capitalize text-gray-950">{currentPlanLabel}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">{t("creditsLeft")}</p>
                  <p className="mt-1 font-semibold text-gray-950">{creditsLeft ?? "Unavailable"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">{t("status")}</p>
                  <p className="mt-1 font-semibold capitalize text-gray-950">{subscriptionStatus}</p>
                </div>
              </div>
            </aside>
          ) : null}
        </div>

        {statusMessage ? (
          <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {statusMessage}
          </p>
        ) : null}

        {visibleError ? (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {visibleError}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isCheckingOut = checkoutPlanId === plan.id;

            return (
              <article
                key={plan.id}
                className={`card flex min-h-[25rem] flex-col p-6 shadow-sm ${
                  isCurrentPlan ? "ring-2 ring-gray-950" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-gray-950">{plan.name}</h2>
                    <p className="mt-2 text-3xl font-semibold text-gray-950">{plan.price_label}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isCurrentPlan ? (
                      <span className="rounded-md bg-gray-950 px-2 py-1 text-xs font-semibold text-white">
                        {t("current")}
                      </span>
                    ) : null}
                    {plan.coming_soon ? (
                      <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
                        {t("comingSoon")}
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-gray-600">{plan.description}</p>
                <ul className="mt-6 space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
                    <span>{plan.analyses_included} AI analyses included</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
                    <span>{plan.id === "free" ? "Trial-ready account access" : `${plan.analyses_included} analyses/month`}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" aria-hidden="true" />
                    <span>{t("protectedHistory")}</span>
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
                      {isCurrentPlan ? t("current") : t("upgrade")}
                    </button>
                  ) : (
                    <Link
                      href="/signup"
                      className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black"
                    >
                      {t("signup")}
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
