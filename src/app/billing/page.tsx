"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, ReceiptText, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import UpgradeRequiredCard from "@/components/UpgradeRequiredCard";
import { useAuth } from "@/contexts/AuthContext";
import { BillingUsage } from "@/domain/billing/types";
import { billingService } from "@/services/BillingService";
import { toFriendlyApiMessage } from "@/services/api";

function titleCase(value?: string | null) {
  if (!value) return "Free";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function BillingPage() {
  const { isAuthenticated, user } = useAuth();
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setUsage(null);
      setError("");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError("");

    billingService
      .getUsage()
      .then((response) => {
        if (!isMounted) return;
        setUsage(response);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(toFriendlyApiMessage(loadError, "Could not refresh billing usage."));
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const planName = titleCase(usage?.plan_name ?? user?.plan_name);
  const subscriptionStatus = usage?.subscription_status ?? user?.subscription_status ?? "trial";
  const creditsLeft = Math.max(0, usage?.free_analysis_credits ?? user?.free_analysis_credits ?? 15);
  const isUpgradeRequired = creditsLeft === 0 && subscriptionStatus.toLowerCase() !== "active";

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProtectedRoute>
          <div className="mb-8 max-w-3xl">
            <p className="muted-label">Billing & usage</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">Plan and trial credits</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Track your current plan, credit balance, and usage while payments remain in coming-soon mode.
            </p>
          </div>

          {isLoading ? (
            <section className="card mb-5 flex items-center gap-3 p-5" role="status" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" aria-hidden="true" />
              <p className="text-sm font-semibold text-gray-950">Refreshing billing usage...</p>
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
              <p className="muted-label mt-5">Current plan</p>
              <h2 id="billing-plan-title" className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
                {planName}
              </h2>
              <p className="mt-2 text-sm capitalize text-gray-600">{subscriptionStatus}</p>
            </section>

            <section className="card p-6" aria-labelledby="billing-credits-title">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="muted-label mt-5">Free credits</p>
              <h2 id="billing-credits-title" className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
                {creditsLeft} remaining
              </h2>
              <p className="mt-2 text-sm text-gray-600">15 free AI analyses are included in the trial.</p>
            </section>

            <section className="card p-6" aria-labelledby="billing-usage-title">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <ReceiptText className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="muted-label mt-5">Usage summary</p>
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
                  Live payments are coming soon
                </h2>
                <p className="mt-2 text-sm text-gray-600">Live payments are coming soon. Your free trial is active.</p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black"
              >
                View plans
              </Link>
            </div>
          </section>
        </ProtectedRoute>
      </div>
    </main>
  );
}
