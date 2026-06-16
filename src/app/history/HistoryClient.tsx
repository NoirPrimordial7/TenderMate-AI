"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import HistoryTable from "@/components/HistoryTable";
import ProtectedRoute from "@/components/ProtectedRoute";
import { HistoryTender } from "@/domain/tender/types";
import { tenderService } from "@/services/TenderService";
import { toFriendlyApiMessage } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

export default function HistoryClient() {
  const { isAuthenticated, user } = useAuth();
  const [history, setHistory] = useState<HistoryTender[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasUsageFields = typeof user?.free_analysis_credits === "number";
  const freeCredits = Math.max(0, user?.free_analysis_credits ?? 0);
  const shouldShowPricingCta = hasUsageFields && freeCredits === 0 && user?.subscription_status?.toLowerCase() !== "active";

  useEffect(() => {
    if (!isAuthenticated) {
      setHasLoaded(false);
      setHistory([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setHasLoaded(false);
    setHistory([]);
    setError("");

    tenderService
      .getBackendTenderHistory()
      .then((items) => {
        if (isMounted) setHistory(items);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(toFriendlyApiMessage(loadError, "Could not load tender history from the backend."));
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
        setHasLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  return (
    <ProtectedRoute>
      {isLoading ? (
        <section className="card p-6" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-gray-950">Loading tender history...</p>
        </section>
      ) : null}

      {hasLoaded && !isLoading && error ? (
        <EmptyState
          title="Could not load history"
          description={error}
          actionHref="/"
          actionLabel="Upload tender"
        />
      ) : null}

      {hasLoaded && !isLoading && !error && history.length === 0 ? (
        <EmptyState
          title="No analyzed tenders yet"
          description="Analyzed tenders will appear here with fit scores, risk levels, deadlines, and decision summaries."
          actionHref="/"
          actionLabel="Upload tender"
          secondaryActionHref={shouldShowPricingCta ? "/pricing" : undefined}
          secondaryActionLabel={shouldShowPricingCta ? "View pricing" : undefined}
        />
      ) : null}

      {hasLoaded && !isLoading && !error && history.length > 0 ? (
        <HistoryTable items={history} description="Tender analyses loaded from your protected backend account." />
      ) : null}
    </ProtectedRoute>
  );
}
