"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, FileText, LogOut, ShieldCheck, UserCircle } from "lucide-react";
import Header from "@/components/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { BillingUsage } from "@/domain/billing/types";
import { billingService } from "@/services/BillingService";
import { toFriendlyApiMessage } from "@/services/api";

const FREE_TRIAL_CREDITS = 5;

function titleCase(value?: string | null) {
  if (!value) return "Free";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function progressPercent(creditsLeft: number) {
  return Math.max(0, Math.min(100, (creditsLeft / FREE_TRIAL_CREDITS) * 100));
}

export default function ProfilePage() {
  const { isAuthenticated, logout, user } = useAuth();
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      setUsage(null);
      setError("");
      return;
    }

    let isMounted = true;
    billingService
      .getUsage()
      .then((response) => {
        if (!isMounted) return;
        setUsage(response);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(toFriendlyApiMessage(loadError, "Could not refresh billing usage."));
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const planName = titleCase(usage?.plan_name ?? user?.plan_name);
  const subscriptionStatus = usage?.subscription_status ?? user?.subscription_status ?? "trial";
  const creditsLeft = Math.max(0, usage?.free_analysis_credits ?? user?.free_analysis_credits ?? FREE_TRIAL_CREDITS);
  const creditsUsed = Math.max(0, FREE_TRIAL_CREDITS - creditsLeft);
  const usageCounts = usage?.usage_counts;

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProtectedRoute>
          <div className="mb-8 max-w-3xl">
            <p className="muted-label">Account</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">Profile</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Manage your TenderMate account, trial credits, billing status, and security actions.
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
                  <p className="muted-label">Account overview</p>
                  <h2 id="account-overview-title" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
                    {user?.full_name || "TenderMate user"}
                  </h2>
                </div>
              </div>
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <dt className="text-gray-500">Full name</dt>
                  <dd className="mt-1 font-semibold text-gray-950">{user?.full_name || "Not provided"}</dd>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="mt-1 break-words font-semibold text-gray-950">{user?.email}</dd>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <dt className="text-gray-500">Role</dt>
                  <dd className="mt-1 font-semibold capitalize text-gray-950">{user?.role?.replace("_", " ")}</dd>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <dt className="text-gray-500">Account status</dt>
                  <dd className="mt-1 font-semibold text-gray-950">{user?.is_active ? "Active" : "Inactive"}</dd>
                </div>
              </dl>
            </section>

            <section className="card p-6" aria-labelledby="current-plan-title">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="muted-label">Current plan</p>
                  <h2 id="current-plan-title" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
                    {planName}
                  </h2>
                  <p className="mt-1 text-sm capitalize text-gray-500">{subscriptionStatus}</p>
                </div>
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  {creditsLeft} credits left
                </span>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                  <span>{creditsUsed} used</span>
                  <span>{FREE_TRIAL_CREDITS} included</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-gray-950" style={{ width: `${progressPercent(creditsLeft)}%` }} />
                </div>
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
                  <p className="muted-label">Usage summary</p>
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
                  <p className="muted-label">Security</p>
                  <h2 id="security-title" className="mt-1 text-xl font-semibold tracking-tight text-gray-950">
                    Account protection
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
                Logout
              </button>
            </section>
          </div>

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
