"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import TenderAnalysisView from "@/components/TenderAnalysisView";
import { useAuth } from "@/contexts/AuthContext";
import { TenderAnalysis } from "@/domain/tender/types";
import { tenderService } from "@/services/TenderService";
import { toFriendlyApiMessage } from "@/services/api";

export default function DashboardClient() {
  const { isAuthenticated, user } = useAuth();
  const [tender, setTender] = useState<TenderAnalysis | null>(null);
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
      .getBackendDashboardTender()
      .then((latestTender) => {
        if (!isMounted) return;
        setTender(latestTender);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setError(toFriendlyApiMessage(loadError, "Could not load the latest tender from the backend."));
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
      {user ? (
        <div className="mb-5 rounded-lg border border-gray-200 bg-white px-5 py-4">
          <p className="text-sm text-gray-600">Logged in as</p>
          <p className="mt-1 font-semibold text-gray-950">{user.full_name || user.email}</p>
        </div>
      ) : null}

      {isLoading ? (
        <section className="card p-6" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-gray-950">Loading latest tender...</p>
        </section>
      ) : null}

      {hasLoaded && !isLoading && error ? (
        <EmptyState
          title="Could not load latest tender"
          description={error}
          actionHref="/"
          actionLabel="Upload tender"
        />
      ) : null}

      {hasLoaded && !isLoading && !error && !tender ? (
        <EmptyState
          title="No tenders analyzed yet"
          description="No tenders analyzed yet. Upload a tender to begin."
          actionHref="/"
          actionLabel="Upload tender"
        />
      ) : null}

      {hasLoaded && !isLoading && !error && tender ? <TenderAnalysisView analysis={tender} /> : null}
    </ProtectedRoute>
  );
}
