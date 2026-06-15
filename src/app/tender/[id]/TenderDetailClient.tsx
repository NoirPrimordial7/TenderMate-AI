"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import TenderAnalysisView from "@/components/TenderAnalysisView";
import { useAuth } from "@/contexts/AuthContext";
import { TenderAnalysis } from "@/domain/tender/types";
import { tenderService } from "@/services/TenderService";
import { toFriendlyApiMessage } from "@/services/api";

export default function TenderDetailClient({ id }: { id: string }) {
  const { isAuthenticated } = useAuth();
  const [analysis, setAnalysis] = useState<TenderAnalysis | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setHasLoaded(false);
      setAnalysis(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setHasLoaded(false);
    setAnalysis(null);
    setError("");

    tenderService
      .getBackendTenderDetails(id)
      .then((tender) => {
        if (isMounted) setAnalysis(tender);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(toFriendlyApiMessage(loadError, "Could not load this tender from the backend."));
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
        setHasLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated]);

  return (
    <ProtectedRoute>
      {isLoading ? (
        <section className="card p-6" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-gray-950">Loading tender analysis...</p>
        </section>
      ) : null}

      {hasLoaded && !isLoading && error ? (
        <EmptyState title="Tender not found" description={error} actionHref="/history" actionLabel="Back to history" />
      ) : null}

      {hasLoaded && !isLoading && !error && !analysis ? (
        <EmptyState
          title="Tender not found"
          description="This tender does not exist, does not belong to your account, or does not have analysis data yet."
          actionHref="/history"
          actionLabel="Back to history"
        />
      ) : null}

      {hasLoaded && !isLoading && !error && analysis ? <TenderAnalysisView analysis={analysis} /> : null}
    </ProtectedRoute>
  );
}
