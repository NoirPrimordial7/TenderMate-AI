"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Loader2,
  LogIn,
  Upload,
  UserPlus
} from "lucide-react";
import LoadingState from "@/components/LoadingState";
import UpgradeRequiredCard from "@/components/UpgradeRequiredCard";
import { useAuth } from "@/contexts/AuthContext";
import { tenderService } from "@/services/TenderService";
import { ApiError, toFriendlyApiMessage } from "@/services/api";

const MAX_PDF_UPLOAD_BYTES = 20 * 1024 * 1024;
const benefitChips = ["Eligibility", "Documents", "Risks", "Dates", "Apply/No-Apply decision"];

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function getUploadErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session expired. Please log in and upload the PDF again.";
    if (error.status === 413) return "This PDF is larger than 20 MB. Please upload a smaller file.";
    if (error.status === 429) return "Daily upload limit reached. Please try again tomorrow.";
    if (error.status >= 500) return "PDF storage is temporarily unavailable. Please try again in a moment.";
  }

  return toFriendlyApiMessage(error, "Could not upload the PDF. Please try again.");
}

export default function UploadCard() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const hasUsageFields = typeof user?.free_analysis_credits === "number";
  const freeCredits = Math.max(0, user?.free_analysis_credits ?? 0);
  const displayCredits = hasUsageFields ? freeCredits : 5;
  const hasAnalysisAccess = !hasUsageFields || freeCredits > 0 || user?.subscription_status?.toLowerCase() === "active";

  const setFile = (file?: File) => {
    setUploadError("");
    setSuccessMessage("");

    if (!file) return false;

    if (!isPdfFile(file)) {
      setSelectedFile(null);
      setFileError("Only PDF files can be uploaded.");
      return false;
    }

    if (file.size > MAX_PDF_UPLOAD_BYTES) {
      setSelectedFile(null);
      setFileError("PDF files must be 20 MB or smaller.");
      return false;
    }

    setSelectedFile(file);
    setFileError("");
    return true;
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    setFile(event.dataTransfer.files?.[0]);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const accepted = setFile(event.target.files?.[0]);
    if (!accepted) event.target.value = "";
  };

  const uploadTender = async () => {
    if (!isAuthenticated) {
      router.push("/login?next=/upload");
      return;
    }

    if (!selectedFile || fileError) return;

    setIsUploading(true);
    setUploadError("");
    setSuccessMessage("");

    try {
      const response = await tenderService.uploadTenderPdf(selectedFile);
      setSuccessMessage(response.message);
      window.setTimeout(() => router.push(`/tender/${response.tender_id}`), 750);
    } catch (error) {
      setUploadError(getUploadErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
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
            Log in to upload tender PDFs to your private workspace and keep tender history linked to your account.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {benefitChips.map((chip) => (
              <span key={chip} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/login?next=/upload"
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

  const uploadPanel = (
    <section className="card w-full p-6 sm:p-8" aria-labelledby="upload-title">
      <div className="mb-6">
        <p className="muted-label">TenderMate AI</p>
        <h1 id="upload-title" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
          Upload tender PDF
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Store a tender PDF in your private workspace. PDF extraction and AI analysis are coming next.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {benefitChips.map((chip) => (
            <span key={chip} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
              {chip}
            </span>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Current credits</p>
          <p className="mt-1 text-sm font-semibold text-emerald-900">Free analyses left: {displayCredits}</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            Upload quota is separate: 5 PDF uploads per day. Analysis will require credits when it launches.
          </p>
        </div>
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
        <span className="mt-2 text-xs font-medium text-gray-500">Maximum file size: 20 MB</span>
      </label>

      {selectedFile ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <FileText className="h-5 w-5 flex-none text-gray-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-950">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)} ready to upload</p>
          </div>
        </div>
      ) : null}

      {fileError || uploadError ? (
        <div className="mt-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <p className="font-medium">{fileError || uploadError}</p>
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-4 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <p className="font-medium">{successMessage}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={uploadTender}
        disabled={!selectedFile || Boolean(fileError) || Boolean(successMessage) || isUploading}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {isUploading ? "Uploading tender..." : "Upload tender"}
      </button>
      <Link
        href="/dashboard"
        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-950 hover:bg-gray-50"
      >
        <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
        Go to dashboard
      </Link>
      {isUploading ? <LoadingState message="Uploading PDF to secure storage..." /> : null}
    </section>
  );

  if (user && hasUsageFields && !hasAnalysisAccess) {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <UpgradeRequiredCard className="w-full" />
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
          You can still upload PDFs up to the daily upload quota. AI analysis will stay unavailable until you have
          credits or an active plan.
        </div>
        {uploadPanel}
      </div>
    );
  }

  return <div className="w-full max-w-2xl">{uploadPanel}</div>;
}
