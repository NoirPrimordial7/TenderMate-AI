"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, RotateCcw, Sparkles } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import TenderAnalysisView from "@/components/TenderAnalysisView";
import UpgradeRequiredCard from "@/components/UpgradeRequiredCard";
import { useAuth } from "@/contexts/AuthContext";
import { TenderRecordView } from "@/domain/tender/types";
import { tenderService } from "@/services/TenderService";
import { ApiError, toFriendlyApiMessage } from "@/services/api";

function getExtractionErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session expired. Please log in and try again.";
    if (error.status === 404) return "This tender was not found in your account.";
    if (error.status === 429) return "Too many extraction requests. Please try again later.";
    if (error.status >= 500) return "PDF extraction is temporarily unavailable. Please try again in a moment.";
  }

  return toFriendlyApiMessage(error, "Could not extract PDF text. Please try again.");
}

function getAnalysisErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session expired. Please log in and try again.";
    if (error.status === 402) return "Free analysis limit reached. Please upgrade to continue.";
    if (error.status === 404) return "This tender was not found in your account.";
    if (error.status === 429) return "Too many analysis requests. Please try again later.";
    if (error.status >= 500) return "AI analysis is temporarily unavailable. Please try again in a moment.";
  }

  return toFriendlyApiMessage(error, "Could not analyze this tender. Please try again.");
}

function PendingExtractionCard({
  tender,
  error,
  analysisError,
  isExtracting,
  isAnalyzing,
  creditsLeft,
  hasAnalysisAccess,
  onExtract,
  onAnalyze
}: {
  tender: TenderRecordView;
  error: string;
  analysisError: string;
  isExtracting: boolean;
  isAnalyzing: boolean;
  creditsLeft: number | null;
  hasAnalysisAccess: boolean;
  onExtract: () => void;
  onAnalyze: () => void;
}) {
  const isFailed = tender.status === "failed" || tender.status === "upload_failed";
  const isExtracted = tender.status === "extracted";
  const hasExtractedPages = Boolean((tender.pageCount ?? 0) > 0 || tender.extractedTextPreview);
  const isAnalysisFailure = isFailed && hasExtractedPages;

  if (isExtracted || isAnalysisFailure) {
    return (
      <>
        <section className="card p-6" aria-labelledby="extracted-title">
          <div className="flex items-start gap-3">
            {isAnalysisFailure ? (
              <AlertCircle className="mt-1 h-5 w-5 flex-none text-red-700" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-1 h-5 w-5 flex-none text-emerald-700" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="muted-label">{isAnalysisFailure ? "Analysis failed" : "Extraction complete"}</p>
              <h1 id="extracted-title" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
                {isAnalysisFailure
                  ? "AI analysis failed. Retry when ready."
                  : "PDF text extracted successfully. Run AI tender analysis."}
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {isAnalysisFailure
                  ? tender.errorMessage ?? "Gemini analysis could not be completed."
                  : "Generate an MSME-focused tender report from the extracted PDF text."}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pages</p>
              <p className="mt-1 text-lg font-semibold text-gray-950">{tender.pageCount ?? 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</p>
              <p className="mt-1 text-lg font-semibold capitalize text-gray-950">{tender.status}</p>
            </div>
          </div>
          {tender.extractedTextPreview ? (
            <div className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Text preview</p>
              <p className="mt-2 line-clamp-6 text-sm leading-6 text-gray-700">{tender.extractedTextPreview}</p>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              No selectable text was found. The PDF may be scanned, and OCR can be added in a later phase.
            </div>
          )}

          {analysisError ? (
            <div className="mt-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              <p className="font-medium">{analysisError}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing || !hasAnalysisAccess}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : isAnalysisFailure ? (
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {isAnalyzing ? "Analyzing tender with Gemini..." : isAnalysisFailure ? "Retry AI analysis" : "Analyze with AI"}
            </button>
            <p className="text-sm text-gray-500">{creditsLeft === null ? "Usage unavailable" : `Free analyses left: ${creditsLeft}`}</p>
          </div>
        </section>
        {!hasAnalysisAccess ? <UpgradeRequiredCard className="mt-5" /> : null}
      </>
    );
  }

  return (
    <section className="card p-6" aria-labelledby="uploaded-title">
      <div className="flex items-start gap-3">
        {isFailed ? (
          <AlertCircle className="mt-1 h-5 w-5 flex-none text-red-700" aria-hidden="true" />
        ) : (
          <FileText className="mt-1 h-5 w-5 flex-none text-blue-700" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="muted-label">{isFailed ? "Extraction failed" : "PDF uploaded"}</p>
          <h1 id="uploaded-title" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
            {isFailed
              ? "PDF text extraction failed."
              : "PDF uploaded successfully. Extract text to prepare AI analysis."}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {isFailed
              ? tender.errorMessage ?? "Please retry extraction or upload the PDF again."
              : "This will read the stored PDF page by page and save text for Gemini analysis."}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <p className="font-medium">{error}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onExtract}
        disabled={isExtracting}
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isExtracting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : isFailed ? (
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        ) : null}
        {isExtracting ? "Extracting PDF text..." : isFailed ? "Retry extraction" : "Extract PDF text"}
      </button>
    </section>
  );
}

export default function TenderDetailClient({ id }: { id: string }) {
  const { isAuthenticated, user } = useAuth();
  const [tender, setTender] = useState<TenderRecordView | null>(null);
  const [error, setError] = useState("");
  const [extractionError, setExtractionError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasUsageFields = typeof user?.free_analysis_credits === "number";
  const freeCredits = Math.max(0, user?.free_analysis_credits ?? 0);
  const creditsLeft = hasUsageFields ? freeCredits : null;
  const hasActiveSubscription = user?.subscription_status?.toLowerCase() === "active";
  const hasAnalysisAccess = hasActiveSubscription || !hasUsageFields || freeCredits > 0;

  const loadTender = useCallback(() => {
    let isMounted = true;
    setIsLoading(true);
    setHasLoaded(false);
    setTender(null);
    setError("");
    setExtractionError("");
    setAnalysisError("");

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

  useEffect(() => {
    if (!isAuthenticated) {
      setHasLoaded(false);
      setTender(null);
      return;
    }

    return loadTender();
  }, [isAuthenticated, loadTender]);

  const extractPdfText = async () => {
    setIsExtracting(true);
    setExtractionError("");

    try {
      await tenderService.extractTenderText(id);
      await tenderService.getBackendTenderDetails(id).then(setTender);
    } catch (extractError) {
      setExtractionError(getExtractionErrorMessage(extractError));
    } finally {
      setIsExtracting(false);
      setHasLoaded(true);
    }
  };

  const analyzeTender = async () => {
    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      await tenderService.analyzeTender(id);
      await tenderService.getBackendTenderDetails(id).then(setTender);
    } catch (analyzeError) {
      setAnalysisError(getAnalysisErrorMessage(analyzeError));
    } finally {
      setIsAnalyzing(false);
      setHasLoaded(true);
    }
  };

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
        <PendingExtractionCard
          tender={tender}
          error={extractionError}
          analysisError={analysisError}
          isExtracting={isExtracting}
          isAnalyzing={isAnalyzing}
          creditsLeft={creditsLeft}
          hasAnalysisAccess={hasAnalysisAccess}
          onExtract={extractPdfText}
          onAnalyze={analyzeTender}
        />
      ) : null}

      {hasLoaded && !isLoading && !error && tender?.analysis ? <TenderAnalysisView analysis={tender.analysis} /> : null}
    </ProtectedRoute>
  );
}
