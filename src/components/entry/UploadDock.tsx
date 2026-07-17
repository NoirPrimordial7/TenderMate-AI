"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Ban, Loader2, UploadCloud } from "lucide-react";
import { FileSelection } from "@/components/entry/FileSelection";
import { UploadDropzone } from "@/components/entry/UploadDropzone";
import { DockStatus } from "@/components/entry/DockStatus";
import type { AuthUser } from "@/domain/auth/types";
import { tenderService } from "@/services/TenderService";
import { ApiError, toFriendlyApiMessage } from "@/services/api";

const MAX_PDF_UPLOAD_BYTES = 20 * 1024 * 1024;

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getUploadErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session expired. Sign in again, then reselect the PDF.";
    if (error.status === 413) return "This PDF is larger than 20 MB. Choose a smaller file.";
    if (error.status === 429) return "Your daily upload limit has been reached. Please try again tomorrow.";
    if (error.status === 0) return "The upload service could not be reached. Check your connection and try again.";
    if (error.status >= 500) return "Secure PDF storage is temporarily unavailable. Please try again in a moment.";
  }
  return toFriendlyApiMessage(error, "The PDF could not be uploaded. Please try again.");
}

type UploadDockProps = { user: AuthUser; onFileStateChange?: (hasFile: boolean) => void };

export function UploadDock({ user, onFileStateChange }: UploadDockProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const progressPercent = progress?.total ? Math.min(100, Math.round((progress.uploaded / progress.total) * 100)) : null;
  const credits = typeof user.free_analysis_credits === "number" ? Math.max(0, user.free_analysis_credits) : null;
  const planName = user.plan_name ? titleCase(user.plan_name) : null;
  const hasActiveSubscription = user.subscription_status?.toLowerCase() === "active";
  const isOutOfAnalysisCredits = credits === 0 && !hasActiveSubscription;
  const firstName = user.full_name?.trim().split(/\s+/)[0] || "there";

  const selectFile = (file?: File) => {
    setFileError("");
    setUploadError("");
    setSuccessMessage("");
    setNotice("");
    setProgress(null);
    if (!file) return;
    if (!isPdfFile(file)) {
      setSelectedFile(null);
      setFileError("Only PDF files can be uploaded.");
      return;
    }
    if (file.size === 0) {
      setSelectedFile(null);
      setFileError("This PDF is empty. Choose a document with content.");
      return;
    }
    if (file.size > MAX_PDF_UPLOAD_BYTES) {
      setSelectedFile(null);
      setFileError("PDF files must be 20 MB or smaller.");
      return;
    }
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileError("");
    setUploadError("");
    setNotice("");
    setProgress(null);
  };

  const uploadTender = async () => {
    if (!selectedFile || fileError || isUploading || successMessage) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsUploading(true);
    setUploadError("");
    setNotice("");
    setSuccessMessage("");
    setProgress(null);
    try {
      const response = await tenderService.uploadTenderPdf(selectedFile, { signal: controller.signal, onProgress: (uploaded, total) => setProgress({ uploaded, total }) });
      setProgress((current) => current ? { ...current, uploaded: current.total } : null);
      setSuccessMessage(response.message || "PDF uploaded successfully.");
      redirectTimerRef.current = setTimeout(() => router.push(`/tender/${response.tender_id}`), 700);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setNotice("Upload cancelled. Your PDF remains selected so you can try again.");
        setProgress(null);
      } else {
        setUploadError(getUploadErrorMessage(error));
      }
    } finally {
      abortControllerRef.current = null;
      setIsUploading(false);
    }
  };

  return (
    <section className="te-upload-dock" aria-labelledby="te-upload-title">
      <div className="te-upload-intro">
        <p>Ready, {firstName}.</p>
        <h2 id="te-upload-title">Add the tender.</h2>
        <dl className="te-account-telemetry" aria-label="Current plan and usage">
          <div><dt>Plan</dt><dd>{planName ?? "Unavailable"}</dd></div>
          <div><dt>Credits</dt><dd>{credits ?? "Unavailable"}</dd></div>
        </dl>
      </div>
      <div className="te-upload-workarea">
        {!selectedFile ? (
          <UploadDropzone inputRef={inputRef} isDragging={isDragging} onDraggingChange={setIsDragging} onFile={selectFile} disabled={isUploading || Boolean(successMessage)} />
        ) : (
          <>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ""; }} />
            <FileSelection file={selectedFile} disabled={isUploading || Boolean(successMessage)} onRemove={removeFile} onReplace={() => inputRef.current?.click()} />
          </>
        )}
        <div className="te-upload-messages" aria-live="polite">
          {isOutOfAnalysisCredits ? <DockStatus tone="warning">Analysis needs an active plan or available credit.</DockStatus> : null}
          {fileError ? <DockStatus tone="danger" live="assertive">{fileError}</DockStatus> : null}
          {uploadError ? <DockStatus tone="danger" live="assertive">{uploadError}</DockStatus> : null}
          {notice ? <DockStatus>{notice}</DockStatus> : null}
          {successMessage ? <DockStatus tone="success" title="Upload complete">{successMessage} Opening the tender…</DockStatus> : null}
          {isUploading ? (
            <div className="te-progress" role="status" aria-live="polite">
              <div className="te-progress-row"><span><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {progressPercent === null ? "Starting secure upload…" : `Uploading PDF · ${progressPercent}%`}</span><button type="button" onClick={() => abortControllerRef.current?.abort()}><Ban className="h-3.5 w-3.5" aria-hidden="true" /> Cancel</button></div>
              {progressPercent !== null ? <div className="te-progress-track" aria-hidden="true"><span style={{ width: `${progressPercent}%` }} /></div> : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="te-upload-action-column">
        <p>PDF only · maximum 20 MB</p>
        <button type="button" onClick={uploadTender} disabled={!selectedFile || Boolean(fileError) || Boolean(successMessage) || isUploading} className="te-primary-button te-upload-button">
          <UploadCloud className="h-4 w-4" aria-hidden="true" /><span>{successMessage ? "Upload complete" : isUploading ? "Uploading…" : "Analyse tender"}</span>{!isUploading && !successMessage ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : null}
        </button>
        <div className="te-upload-links"><Link href="/history">History</Link><Link href="/dashboard">Dashboard <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link></div>
      </div>
    </section>
  );
}
