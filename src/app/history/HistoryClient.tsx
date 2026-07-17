"use client";

import useSWR from "swr";
import EmptyState from "@/components/EmptyState";
import HistoryTable from "@/components/HistoryTable";
import ProtectedRoute from "@/components/ProtectedRoute";
import { HistoryTender } from "@/domain/tender/types";
import { tenderService } from "@/services/TenderService";
import { toFriendlyApiMessage } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/contexts/LocaleContext";

export default function HistoryClient() {
  const { isAuthenticated, user } = useAuth();
  const t = useTranslations("history");
  const dashboard = useTranslations("dashboard");
  const hasUsageFields = typeof user?.free_analysis_credits === "number";
  const freeCredits = Math.max(0, user?.free_analysis_credits ?? 0);
  const shouldShowPricingCta = hasUsageFields && freeCredits === 0 && user?.subscription_status?.toLowerCase() !== "active";

  const { data: history = [], error: loadError, isLoading } = useSWR<HistoryTender[]>(
    isAuthenticated && user ? ["private", user.id, "tender-history"] : null,
    () => tenderService.getBackendTenderHistory(),
    { revalidateOnFocus: true }
  );
  const error = loadError ? toFriendlyApiMessage(loadError, t("loadFailedDescription")) : "";
  const hasLoaded = !isLoading && !loadError;

  return (
    <ProtectedRoute>
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
          actionLabel={dashboard("uploadTender")}
        />
      ) : null}

      {hasLoaded && !isLoading && !error && history.length === 0 ? (
        <EmptyState
          title={t("empty")}
          description={t("emptyDescription")}
          actionHref="/"
          actionLabel={dashboard("uploadTender")}
          secondaryActionHref={shouldShowPricingCta ? "/pricing" : undefined}
          secondaryActionLabel={shouldShowPricingCta ? dashboard("viewPricing") : undefined}
        />
      ) : null}

      {hasLoaded && !isLoading && !error && history.length > 0 ? (
        <HistoryTable items={history} description="Tender analyses loaded from your protected backend account." />
      ) : null}
    </ProtectedRoute>
  );
}
