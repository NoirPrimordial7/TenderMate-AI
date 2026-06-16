"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import TenderAnalysisView from "@/components/TenderAnalysisView";
import { useAuth } from "@/contexts/AuthContext";
import { TenderRecordView } from "@/domain/tender/types";
import { tenderService } from "@/services/TenderService";
import { toFriendlyApiMessage } from "@/services/api";

export default function TenderDetailClient({ id }: { id: string }) {
  const { isAuthenticated } = useAuth();
  const [tender, setTender] = useState<TenderRecordView | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setHasLoaded(false);
      setTender(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setHasLoaded(false);
    setTender(null);
    setError("");

    tenderService
      .getBackendTenderDetails(id)
      .then((tender) => {
        if (isMounted) setTender(tender);
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

      {hasLoaded && !isLoading && !error && !tender ? (
        <EmptyState
          title="Tender not found"
          description="This tender does not exist or does not belong to your account."
          actionHref="/history"
          actionLabel="Back to history"
        />
      ) : null}

      {hasLoaded && !isLoading && !error && tender && !tender.analysis ? (
        <EmptyState
          title="PDF uploaded successfully"
          description="Analysis has not started yet. PDF extraction and AI analysis are coming next."
          actionHref="/history"
          actionLabel="Back to history"
          secondaryActionHref="/"
          secondaryActionLabel="Upload another tender"
        />
      ) : null}

      {hasLoaded && !isLoading && !error && tender?.analysis ? <TenderAnalysisView analysis={tender.analysis} /> : null}
    </ProtectedRoute>
  );
}
