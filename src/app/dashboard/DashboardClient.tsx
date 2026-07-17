"use client";

import useSWR from "swr";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import TenderAnalysisView from "@/components/TenderAnalysisView";
import { useAuth } from "@/contexts/AuthContext";
import { TenderRecordView } from "@/domain/tender/types";
import { tenderService } from "@/services/TenderService";
import { toFriendlyApiMessage } from "@/services/api";
import { useTranslations } from "@/contexts/LocaleContext";

export default function DashboardClient() {
  const { isAuthenticated, user } = useAuth();
  const t = useTranslations("dashboard");
  const navigation = useTranslations("navigation");
  const tenderCopy = useTranslations("tender");
  const hasUsageFields = typeof user?.free_analysis_credits === "number";
  const freeCredits = Math.max(0, user?.free_analysis_credits ?? 0);
  const hasActiveSubscription = user?.subscription_status?.toLowerCase() === "active";
  const { data: tender, error: loadError, isLoading } = useSWR<TenderRecordView | null>(
    isAuthenticated && user ? ["private", user.id, "latest-tender"] : null,
    () => tenderService.getBackendDashboardTender(),
    { revalidateOnFocus: true }
  );
  const error = loadError ? toFriendlyApiMessage(loadError, t("loadFailedDescription")) : "";
  const hasLoaded = !isLoading && !loadError && tender !== undefined;

  return (
    <ProtectedRoute>
      {user ? (
        <div className="mb-5 grid gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="muted-label">{t("overview")}</p>
            <p className="mt-1 text-lg font-semibold text-gray-950">{user.full_name || user.email}</p>
            <p className="mt-1 text-sm text-gray-500">{t("protected")}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="font-semibold text-gray-950">
              {hasUsageFields && freeCredits === 0 && !hasActiveSubscription
                ? navigation("upgradeRequired")
                : hasUsageFields ? t("freeLeft", { count: freeCredits }) : navigation("usageUnavailable")}
            </p>
            <p className="mt-1 text-xs capitalize text-gray-500">
              {user.plan_name ?? "free"} plan - {user.subscription_status ?? "trial"}
            </p>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <section className="card p-6" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-gray-950">{t("loading")}</p>
        </section>
      ) : null}

      {hasLoaded && !isLoading && error ? (
        <EmptyState
          title={t("loadFailed")}
          description={error}
          actionHref="/"
          actionLabel={t("uploadTender")}
        />
      ) : null}

      {hasLoaded && !isLoading && !error && !tender ? (
        <EmptyState
          title={t("empty")}
          description={t("emptyDescription")}
          actionHref="/"
          actionLabel={t("uploadTender")}
          secondaryActionHref="/pricing"
          secondaryActionLabel={t("viewPricing")}
        />
      ) : null}

      {hasLoaded && !isLoading && !error && tender && !tender.analysis ? (
        <EmptyState
          title={tender.status === "extracted" ? tenderCopy("readyAnalysis") : tenderCopy("uploaded")}
          description={
            tender.status === "extracted"
              ? "PDF text extracted successfully. Run AI analysis when ready."
              : "Tender uploaded. Extract PDF text first, then run AI analysis."
          }
          actionHref={`/tender/${tender.id}`}
          actionLabel={tender.status === "extracted" ? tenderCopy("runAnalysis") : tenderCopy("viewStatus")}
          secondaryActionHref="/history"
          secondaryActionLabel={navigation("history")}
        />
      ) : null}

      {hasLoaded && !isLoading && !error && tender?.analysis ? <TenderAnalysisView analysis={tender.analysis} /> : null}
    </ProtectedRoute>
  );
}
