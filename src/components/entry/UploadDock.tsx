"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Ban, Loader2, UploadCloud } from "lucide-react";
import { UploadDropzone } from "@/components/entry/UploadDropzone";
import { DockStatus } from "@/components/entry/DockStatus";
import type { PdfInspection } from "@/components/entry/SelectedPdfExperience";
import type { AuthUser } from "@/domain/auth/types";
import { tenderService } from "@/services/TenderService";
import { ApiError } from "@/services/api";
import { useTranslations } from "@/contexts/LocaleContext";

function PreviewLoading() {
  const t = useTranslations("upload");
  return <div className="te-file-selection-loading" role="status"><span />{t("preparingPreview")}</div>;
}

const SelectedPdfExperience = dynamic(
  () => import("@/components/entry/SelectedPdfExperience").then((module) => module.SelectedPdfExperience),
  {
    ssr: false,
    loading: PreviewLoading
  }
);

const MAX_PDF_UPLOAD_BYTES = 20 * 1024 * 1024;
const EMPTY_INSPECTION: PdfInspection = { status: "loading", pageCount: null, error: "" };

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getUploadErrorMessage(error: unknown, t: (key: string) => string) {
  if (error instanceof ApiError) {
    if (error.status === 401) return t("sessionExpired");
    if (error.status === 413) return t("tooLarge");
    if (error.status === 429) return t("dailyLimit");
    if (error.status === 0) return t("serviceUnreachable");
    if (error.status >= 500) return t("storageUnavailable");
  }
  return t("failed");
}

type UploadDockProps = { user: AuthUser; onFileStateChange?: (hasFile: boolean) => void };

export function UploadDock({ user, onFileStateChange }: UploadDockProps) {
  const router = useRouter();
  const t = useTranslations("upload");
  const common = useTranslations("common");
  const navigation = useTranslations("navigation");
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<PdfInspection>(EMPTY_INSPECTION);
  const [fileError, setFileError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [notice, setNotice] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<{ uploaded: number; total: number } | null>(null);

  useEffect(() => () => {
    abortControllerRef.current?.abort();
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  useEffect(() => {
    onFileStateChange?.(Boolean(selectedFile));
  }, [onFileStateChange, selectedFile]);

  const handleInspectionChange = useCallback((nextInspection: PdfInspection) => {
    setInspection(nextInspection);
  }, []);

  const progressPercent = progress?.total ? Math.min(100, Math.round((progress.uploaded / progress.total) * 100)) : null;
  const credits = typeof user.free_analysis_credits === "number" ? Math.max(0, user.free_analysis_credits) : null;
  const planName = user.plan_name ? titleCase(user.plan_name) : null;
  const hasActiveSubscription = user.subscription_status?.toLowerCase() === "active";
  const isOutOfAnalysisCredits = credits === 0 && !hasActiveSubscription;
  const firstName = user.full_name?.trim().split(/\s+/)[0] || t("greetingFallback");
  const hasValidPdf = Boolean(selectedFile) && !fileError && inspection.status === "ready";

  const selectFile = (file?: File) => {
    setFileError("");
    setUploadError("");
    setSuccessMessage("");
    setNotice("");
    setProgress(null);
    setInspection(EMPTY_INSPECTION);
    if (!file) return;
    if (!isPdfFile(file)) {
      setSelectedFile(null);
      setFileError(t("onlyPdf"));
      return;
    }
    if (file.size === 0) {
      setSelectedFile(null);
      setFileError(t("emptyPdf"));
      return;
    }
    if (file.size > MAX_PDF_UPLOAD_BYTES) {
      setSelectedFile(null);
      setFileError(t("tooLarge"));
      return;
    }
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setInspection(EMPTY_INSPECTION);
    setFileError("");
    setUploadError("");
    setNotice("");
    setProgress(null);
  };

  const uploadTender = async () => {
    if (!selectedFile || !hasValidPdf || isUploading || successMessage) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsUploading(true);
    setUploadError("");
    setNotice("");
    setSuccessMessage("");
    setProgress(null);
    try {
      const response = await tenderService.uploadTenderPdf(selectedFile, {
        signal: controller.signal,
        onProgress: (uploaded, total) => setProgress({ uploaded, total })
      });
      setProgress((current) => current ? { ...current, uploaded: current.total } : null);
      setSuccessMessage(t("success"));
      redirectTimerRef.current = setTimeout(() => router.push(`/tender/${response.tender_id}`), 700);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setNotice(t("cancelled"));
        setProgress(null);
      } else {
        setUploadError(getUploadErrorMessage(error, t));
      }
    } finally {
      abortControllerRef.current = null;
      setIsUploading(false);
    }
  };

  return (
    <section className="te-upload-dock" aria-labelledby="te-upload-title">
      <div className="te-upload-intro">
        <p>{t("ready", { name: firstName })}</p>
        <h2 id="te-upload-title">{t("title")}</h2>
        <dl className="te-account-telemetry" aria-label={t("planUsage")}>
          <div><dt>{common("plan")}</dt><dd>{planName ?? common("unavailable")}</dd></div>
          <div><dt>{common("credits")}</dt><dd>{credits ?? common("unavailable")}</dd></div>
        </dl>
      </div>

      <div className="te-upload-workarea">
        {!selectedFile ? (
          <UploadDropzone inputRef={inputRef} isDragging={isDragging} onDraggingChange={setIsDragging} onFile={selectFile} disabled={isUploading || Boolean(successMessage)} />
        ) : (
          <>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ""; }} />
            <SelectedPdfExperience
              key={`${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`}
              file={selectedFile}
              disabled={isUploading || Boolean(successMessage)}
              onInspectionChange={handleInspectionChange}
              onRemove={removeFile}
              onReplace={() => inputRef.current?.click()}
            />
          </>
        )}

        <div className="te-upload-messages" aria-live="polite">
          {isOutOfAnalysisCredits ? <DockStatus tone="warning">{t("creditWarning")}</DockStatus> : null}
          {fileError ? <DockStatus tone="danger" live="assertive">{fileError}</DockStatus> : null}
          {inspection.status === "error" ? <DockStatus tone="danger" live="assertive">{inspection.error}</DockStatus> : null}
          {uploadError ? <DockStatus tone="danger" live="assertive">{uploadError}</DockStatus> : null}
          {notice ? <DockStatus>{notice}</DockStatus> : null}
          {successMessage ? <DockStatus tone="success" title={t("complete")}>{successMessage} {t("opening")}</DockStatus> : null}
          {isUploading ? (
            <div className="te-progress" role="status" aria-live="polite">
              <div className="te-progress-row"><span><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {progressPercent === null ? t("starting") : t("progress", { percent: progressPercent })}</span><button type="button" onClick={() => abortControllerRef.current?.abort()}><Ban className="h-3.5 w-3.5" aria-hidden="true" /> {common("cancel")}</button></div>
              {progressPercent !== null ? <div className="te-progress-track" aria-hidden="true"><span style={{ width: `${progressPercent}%` }} /></div> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="te-upload-action-column">
        <p>{t("pdfOnly")}</p>
        <button type="button" onClick={uploadTender} disabled={!hasValidPdf || Boolean(successMessage) || isUploading} className="te-primary-button te-upload-button">
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          <span>{successMessage ? t("complete") : isUploading ? t("uploading") : inspection.status === "loading" && selectedFile ? t("checking") : t("uploadOpen")}</span>
          {!isUploading && !successMessage ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : null}
        </button>
        <div className="te-upload-links"><Link href="/history">{navigation("history")}</Link><Link href="/dashboard">{navigation("dashboard")} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>
      </div>
    </section>
  );
}
