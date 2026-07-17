"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getDocument, GlobalWorkerOptions, PasswordException, PasswordResponses } from "pdfjs-dist";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { FileSelection } from "@/components/entry/FileSelection";
import { PdfPageCanvas } from "@/components/entry/PdfPageCanvas";
import { useTranslations } from "@/contexts/LocaleContext";

const PdfPreviewDrawer = dynamic(
  () => import("@/components/entry/PdfPreviewDrawer").then((module) => module.PdfPreviewDrawer),
  { ssr: false }
);

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

// React Strict Mode mounts, cleans up and remounts effects in development.
// Serialize worker teardown so a remount never reuses PDF.js while its previous
// loading task is still being destroyed.
let pdfWorkerTeardown = Promise.resolve();

export type PdfInspection = {
  status: "loading" | "ready" | "error";
  pageCount: number | null;
  error: string;
};

type SelectedPdfExperienceProps = {
  file: File;
  disabled?: boolean;
  onInspectionChange: (inspection: PdfInspection) => void;
  onRemove: () => void;
  onReplace: () => void;
};

function getDocumentError(error: unknown, passwordMessage: string, damagedMessage: string) {
  const passwordCode = typeof error === "object" && error && "code" in error ? Number(error.code) : null;
  if (
    error instanceof PasswordException ||
    (error instanceof Error && error.name === "PasswordException") ||
    passwordCode === PasswordResponses.NEED_PASSWORD ||
    passwordCode === PasswordResponses.INCORRECT_PASSWORD
  ) {
    return passwordMessage;
  }
  return damagedMessage;
}

export function SelectedPdfExperience({ file, disabled, onInspectionChange, onRemove, onReplace }: SelectedPdfExperienceProps) {
  const t = useTranslations("upload");
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [documentError, setDocumentError] = useState("");
  const [thumbnailError, setThumbnailError] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    let disposed = false;
    let passwordRequired = false;
    let loadedDocument: PDFDocumentProxy | null = null;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let teardownPromise: Promise<void> | null = null;

    const scheduleTeardown = () => {
      if (teardownPromise) return teardownPromise;
      const taskToDestroy = loadingTask;
      const documentToDestroy = loadedDocument;
      teardownPromise = pdfWorkerTeardown = pdfWorkerTeardown
        .catch(() => undefined)
        .then(async () => {
          if (taskToDestroy) await taskToDestroy.destroy();
          else if (documentToDestroy) await documentToDestroy.cleanup();
        })
        .finally(() => URL.revokeObjectURL(objectUrl));
      return teardownPromise;
    };

    setPdfDocument(null);
    setDocumentError("");
    setThumbnailError("");
    setIsPreviewOpen(false);
    onInspectionChange({ status: "loading", pageCount: null, error: "" });

    const loadPdf = async () => {
      try {
        await pdfWorkerTeardown;
        if (disposed) return;
        loadingTask = getDocument({ url: objectUrl });
        loadingTask.onPassword = () => {
          passwordRequired = true;
          const message = t("passwordProtected");
          setDocumentError(message);
          onInspectionChange({ status: "error", pageCount: null, error: message });
          void scheduleTeardown();
        };
        loadedDocument = await loadingTask.promise;
        if (disposed) {
          await loadedDocument.cleanup();
          return;
        }
        setPdfDocument(loadedDocument);
        onInspectionChange({ status: "ready", pageCount: loadedDocument.numPages, error: "" });
      } catch (error) {
        if (disposed || passwordRequired) return;
        const message = getDocumentError(error, t("passwordProtected"), t("damaged"));
        setDocumentError(message);
        onInspectionChange({ status: "error", pageCount: null, error: message });
      }
    };

    void loadPdf();
    return () => {
      disposed = true;
      void scheduleTeardown();
    };
  }, [file, onInspectionChange, t]);

  return (
    <>
      <FileSelection
        file={file}
        disabled={disabled}
        pageCount={pdfDocument?.numPages ?? null}
        documentError={documentError || thumbnailError}
        thumbnail={pdfDocument ? <PdfPageCanvas document={pdfDocument} pageNumber={1} variant="thumbnail" onRenderError={setThumbnailError} /> : <div className="te-file-thumbnail-loading"><span />{t("readingFirstPage")}</div>}
        onPreview={() => setIsPreviewOpen(true)}
        onReplace={onReplace}
        onRemove={onRemove}
      />
      {pdfDocument ? (
        <PdfPreviewDrawer
          file={file}
          pdfDocument={pdfDocument}
          isOpen={isPreviewOpen}
          isUploadActive={disabled}
          onClose={() => setIsPreviewOpen(false)}
          onReplace={onReplace}
        />
      ) : null}
    </>
  );
}
