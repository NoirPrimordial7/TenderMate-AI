"use client";

import useSWR from "swr";
import Link from "next/link";
import { CreditCard, Loader2, ReceiptText, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import UpgradeRequiredCard from "@/components/UpgradeRequiredCard";
import { useAuth } from "@/contexts/AuthContext";
import { BillingUsage } from "@/domain/billing/types";
import { billingService } from "@/services/BillingService";
import { toFriendlyApiMessage } from "@/services/api";
import { useTranslations } from "@/contexts/LocaleContext";

function titleCase(value?: string | null) {
  if (!value) return "Free";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function BillingPage() {
  const { isAuthenticated, user } = useAuth();
  const t = useTranslations("billing");
  const { data: usage, error: loadError, isLoading } = useSWR<BillingUsage>(
    isAuthenticated && user ? ["private", user.id, "billing-usage"] : null,
    billingService.getUsage
  );
  const error = loadError ? toFriendlyApiMessage(loadError, "Could not refresh billing usage.") : "";

  const planName = titleCase(usage?.plan_name ?? user?.plan_name);
  const subscriptionStatus = usage?.subscription_status ?? user?.subscription_status ?? "trial";
  const creditValue = usage?.free_analysis_credits ?? user?.free_analysis_credits;
  const creditsLeft = typeof creditValue === "number" ? Math.max(0, creditValue) : null;
  const isUpgradeRequired = creditsLeft === 0 && subscriptionStatus.toLowerCase() !== "active";

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProtectedRoute>
          <div className="mb-8 max-w-3xl">
            <p className="muted-label">{t("eyebrow")}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">{t("title")}</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {t("support")}
            </p>
          </div>

          {isLoading ? (
            <section className="card mb-5 flex items-center gap-3 p-5" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" aria-hidden="true" />
              <p className="text-sm font-semibold text-gray-950">{t("refreshing")}</p>
            </section>
          ) : null}

          {error ? (
            <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {error}
            </p>
          ) : null}

          {isUpgradeRequired ? <UpgradeRequiredCard className="mb-5" /> : null}

          <div className="grid gap-5 lg:grid-cols-3">
            <section className="card p-6" aria-labelledby="billing-plan-title">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-950 text-white">
                <CreditCard className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="muted-label mt-5">{t("currentPlan")}</p>
              <h2 id="billing-plan-title" className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
                {planName}
              </h2>
              <p className="mt-2 text-sm capitalize text-gray-600">{subscriptionStatus}</p>
            </section>

            <section className="card p-6" aria-labelledby="billing-credits-title">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="muted-label mt-5">{t("freeCredits")}</p>
              <h2 id="billing-credits-title" className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
                {creditsLeft === null ? "—" : t("remaining", { count: creditsLeft })}
              </h2>
              <p className="mt-2 text-sm text-gray-600">{t("support")}</p>
            </section>

            <section className="card p-6" aria-labelledby="billing-usage-title">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <ReceiptText className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="muted-label mt-5">{t("usageSummary")}</p>
              <h2 id="billing-usage-title" className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
                {usage?.usage_counts.analysis_completed ?? 0} analyses
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                PDF uploads today: {usage?.usage_counts.pdf_upload_today ?? "Available soon"}
              </p>
            </section>
          </div>

          <section className="card mt-5 p-6" aria-labelledby="billing-note-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="billing-note-title" className="text-lg font-semibold tracking-tight text-gray-950">
                  {t("paymentsSoon")}
                </h2>
                <p className="mt-2 text-sm text-gray-600">{t("trialActive")}</p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black"
              >
                {t("viewPlans")}
              </Link>
            </div>
          </section>
        </ProtectedRoute>
      </div>
    </main>
  );
}
