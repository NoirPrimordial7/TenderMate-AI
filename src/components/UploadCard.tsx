"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, LayoutDashboard, Loader2, LogIn, Upload, UserPlus } from "lucide-react";
import LoadingState from "@/components/LoadingState";
import UpgradeRequiredCard from "@/components/UpgradeRequiredCard";
import { useAuth } from "@/contexts/AuthContext";

const loadingMessages = ["Extracting PDF...", "Analyzing eligibility...", "Finding risks...", "Preparing dashboard..."];

export default function UploadCard() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const hasUsageFields = typeof user?.free_analysis_credits === "number";
  const freeCredits = Math.max(0, user?.free_analysis_credits ?? 0);
  const displayCredits = hasUsageFields ? freeCredits : 5;
  const hasAnalysisAccess = !hasUsageFields || freeCredits > 0 || user?.subscription_status?.toLowerCase() === "active";

  const setFile = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    setFile(event.dataTransfer.files?.[0]);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0]);
  };

  const analyzeTender = () => {
    if (!isAuthenticated) {
      router.push("/login?next=/");
      return;
    }

    setIsAnalyzing(true);
    setLoadingStep(0);
    loadingMessages.forEach((_, index) => {
      window.setTimeout(() => setLoadingStep(index), index * 650);
    });
    window.setTimeout(() => router.push("/dashboard"), loadingMessages.length * 650 + 250);
  };

  if (isAuthLoading) {
    return (
      <section className="card w-full max-w-xl p-6 sm:p-8" aria-live="polite">
        <p className="text-sm font-semibold text-gray-950">Checking your session...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="card w-full max-w-2xl p-6 sm:p-8" aria-labelledby="upload-login-title">
        <div className="mb-6">
          <p className="muted-label">TenderMate AI</p>
          <h1 id="upload-login-title" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
            AI-powered tender analysis for MSMEs
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Upload tender PDFs, understand eligibility, documents, risks, dates, and apply/no-apply decision before
            spending time on a bid.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-black"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Login to start
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-950 hover:bg-gray-50"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Sign up to start
          </Link>
        </div>
      </section>
    );
  }

  if (user && hasUsageFields && !hasAnalysisAccess) {
    return <UpgradeRequiredCard className="w-full max-w-2xl" />;
  }

  return (
    <section className="card w-full max-w-2xl p-6 sm:p-8" aria-labelledby="upload-title">
      <div className="mb-6">
        <p className="muted-label">TenderMate AI</p>
        <h1 id="upload-title" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
          AI-powered tender analysis for MSMEs
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Upload tender PDFs, understand eligibility, documents, risks, dates, and apply/no-apply decision. This MVP
          keeps your tender history linked to your account.
        </p>
        <p className="mt-3 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          Free analyses left: {displayCredits}
        </p>
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition ${
          isDragging ? "border-gray-950 bg-gray-100" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <input type="file" accept="application/pdf,.pdf" onChange={handleChange} className="sr-only" />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
          <Upload className="h-5 w-5 text-gray-700" aria-hidden="true" />
        </span>
        <span className="mt-4 text-base font-semibold text-gray-950">Drag and drop PDF here</span>
        <span className="mt-1 text-sm text-gray-500">or click to browse your computer</span>
      </label>

      {fileName ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <FileText className="h-5 w-5 flex-none text-gray-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-950">{fileName}</p>
            <p className="text-xs text-gray-500">Ready for mock analysis</p>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={analyzeTender}
        disabled={!fileName || isAnalyzing}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {isAnalyzing ? "Analyzing tender..." : "Upload tender"}
      </button>
      <Link
        href="/dashboard"
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-950 hover:bg-gray-50"
      >
        <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
        Go to dashboard
      </Link>
      {isAnalyzing ? <LoadingState message={loadingMessages[loadingStep]} /> : null}
    </section>
  );
}
