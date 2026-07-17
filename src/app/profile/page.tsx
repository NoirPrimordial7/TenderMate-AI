"use client";

import useSWR from "swr";
import Link from "next/link";
import { CreditCard, FileText, LogOut, ShieldCheck, UserCircle } from "lucide-react";
import Header from "@/components/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { BillingUsage } from "@/domain/billing/types";
import { billingService } from "@/services/BillingService";
import { toFriendlyApiMessage } from "@/services/api";
import { useTranslations } from "@/contexts/LocaleContext";
import { LanguageSwitcher } from "@/components/language/LanguageSwitcher";

function titleCase(value?: string | null) {
  if (!value) return "Free";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ProfilePage() {
  const { isAuthenticated, logout, user } = useAuth();
  const t = useTranslations("profile");
  const common = useTranslations("common");
  const { data: usage, error: loadError } = useSWR<BillingUsage>(
    isAuthenticated && user ? ["private", user.id, "billing-usage"] : null,
    billingService.getUsage
  );
  const error = loadError ? toFriendlyApiMessage(loadError, "Could not refresh billing usage.") : "";

  const planName = titleCase(usage?.plan_name ?? user?.plan_name);
  const subscriptionStatus = usage?.subscription_status ?? user?.subscription_status ?? "trial";
  const creditValue = usage?.free_analysis_credits ?? user?.free_analysis_credits;
  const creditsLeft = typeof creditValue === "number" ? Math.max(0, creditValue) : null;
  const usageCounts = usage?.usage_counts;

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

          {error ? (
            <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {error}
            </p>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="card p-6" aria-labelledby="account-overview-title">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-950 text-white">
                  <UserCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="muted-label">{t("overview")}</p>
                  <h2 id="account-overview-title" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
                    {user?.full_name || "TenderMate user"}
                  </h2>
                </div>
              </div>
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <dt className="text-gray-500">{t("fullName")}</dt>
                  <dd className="mt-1 font-semibold text-gray-950">{user?.full_name || common("notProvided")}</dd>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <dt className="text-gray-500">{t("email")}</dt>
                  <dd className="mt-1 break-words font-semibold text-gray-950">{user?.email}</dd>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <dt className="text-gray-500">{t("role")}</dt>
                  <dd className="mt-1 font-semibold capitalize text-gray-950">{user?.role?.replace("_", " ")}</dd>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <dt className="text-gray-500">{t("status")}</dt>
                  <dd className="mt-1 font-semibold text-gray-950">{user?.is_active ? common("active") : common("inactive")}</dd>
                </div>
              </dl>
            </section>

            <section className="card p-6" aria-labelledby="current-plan-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="muted-label">{t("currentPlan")}</p>
                  <h2 id="current-plan-title" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
                    {planName}
                  </h2>
                  <p className="mt-1 text-sm capitalize text-gray-500">{subscriptionStatus}</p>
                </div>
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  {creditsLeft === null ? "Usage unavailable" : `${creditsLeft} credits left`}
                </span>
              </div>
              <Link
                href="/pricing"
                className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black"
              >
                View plans
              </Link>
            </section>

            <section className="card p-6" aria-labelledby="usage-summary-title">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="muted-label">{t("usage")}</p>
                  <h2 id="usage-summary-title" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
                    Trial activity
                  </h2>
                </div>
              </div>
              <dl className="mt-6 grid gap-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <dt className="text-gray-600">PDF uploads today</dt>
                  <dd className="font-semibold text-gray-950">{usageCounts?.pdf_upload_today ?? "Available soon"}</dd>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <dt className="text-gray-600">AI analyses used</dt>
                  <dd className="font-semibold text-gray-950">{usageCounts?.analysis_completed ?? 0}</dd>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <dt className="text-gray-600">Trial status</dt>
                  <dd className="font-semibold capitalize text-gray-950">{subscriptionStatus}</dd>
                </div>
              </dl>
            </section>

            <section className="card p-6" aria-labelledby="security-title">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="muted-label">{t("security")}</p>
                  <h2 id="security-title" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
                    {t("protection")}
                  </h2>
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                <li className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">JWT protected account</li>
                <li className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">Password is securely hashed</li>
              </ul>
              <button
                type="button"
                onClick={() => logout("/login")}
                className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-950 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {t("logout")}
              </button>
            </section>
          </div>

          <section className="card mt-5 p-6" aria-label="Language preferences">
            <LanguageSwitcher />
          </section>

          <section className="card mt-5 p-6" aria-labelledby="recent-activity-title">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <CreditCard className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="muted-label">Recent activity</p>
                <h2 id="recent-activity-title" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
                  Activity logs
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Activity logs will appear here as uploads and analyses are completed.
                </p>
              </div>
            </div>
          </section>
        </ProtectedRoute>
      </div>
    </main>
  );
}
