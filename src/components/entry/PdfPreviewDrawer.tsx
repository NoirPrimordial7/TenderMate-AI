"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { formatFileSize } from "@/components/entry/FileSelection";
import { PdfPageCanvas } from "@/components/entry/PdfPageCanvas";
import { useTranslations } from "@/contexts/LocaleContext";

type PdfPreviewDrawerProps = {
  file: File;
  pdfDocument: PDFDocumentProxy;
  isOpen: boolean;
  isUploadActive?: boolean;
  onClose: () => void;
  onReplace: () => void;
};

export function PdfPreviewDrawer({ file, pdfDocument, isOpen, isUploadActive = false, onClose, onReplace }: PdfPreviewDrawerProps) {
  const shouldReduceMotion = useReducedMotion();
  const t = useTranslations("pdfViewer");
  const common = useTranslations("common");
  const drawerRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pageError, setPageError] = useState("");
  const pageCount = pdfDocument.numPages;

  const closeDrawer = useCallback(() => {
    if (!isUploadActive) onClose();
  }, [isUploadActive, onClose]);

  useEffect(() => {
    setPageNumber(1);
    setZoom(1);
    setPageError("");
  }, [pdfDocument]);

  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => drawerRef.current?.querySelector<HTMLElement>("button")?.focus(), shouldReduceMotion ? 0 : 320);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [closeDrawer, isOpen, shouldReduceMotion]);

  const goToPage = (nextPage: number) => {
    setPageError("");
    setPageNumber(Math.min(pageCount, Math.max(1, nextPage)));
  };

  const drawer = (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="te-preview-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.28 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}
        >
          <motion.div className="te-preview-sweep" aria-hidden="true" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} exit={{ scaleX: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.42, ease: [0.76, 0, 0.24, 1] }} />
          <motion.section
            ref={drawerRef}
            className="te-preview-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="te-preview-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.52, delay: shouldReduceMotion ? 0 : 0.08, ease: [0.76, 0, 0.24, 1] }}
          >
            <header className="te-preview-header">
              <div className="te-preview-title-block">
                <span>{t("localPreview")}</span>
                <h2 id="te-preview-title" title={file.name}>{file.name}</h2>
                <p>{formatFileSize(file.size)} · {pageCount} {pageCount === 1 ? common("page") : common("pages")} · {t("staysDevice")}</p>
              </div>
              <button type="button" className="te-preview-close" onClick={closeDrawer} disabled={isUploadActive} aria-label={t("close")}><X aria-hidden="true" /></button>
            </header>

            <div className="te-preview-toolbar" aria-label={t("controls")}>
              <div className="te-preview-page-controls">
                <button type="button" onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1} aria-label={t("previous")}><ChevronLeft aria-hidden="true" /></button>
                <span aria-live="polite">{pageNumber} / {pageCount}</span>
                <button type="button" onClick={() => goToPage(pageNumber + 1)} disabled={pageNumber >= pageCount} aria-label={t("next")}><ChevronRight aria-hidden="true" /></button>
              </div>
              <div className="te-preview-zoom-controls">
                <button type="button" onClick={() => setZoom((current) => Math.max(0.6, Number((current - 0.2).toFixed(1))))} disabled={zoom <= 0.6} aria-label={t("zoomOut")}><Minus aria-hidden="true" /></button>
                <span>{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => setZoom((current) => Math.min(2.4, Number((current + 0.2).toFixed(1))))} disabled={zoom >= 2.4} aria-label={t("zoomIn")}><Plus aria-hidden="true" /></button>
                <button type="button" className="te-preview-fit" onClick={() => setZoom(1)}><Maximize2 aria-hidden="true" /> {t("fitWidth")}</button>
              </div>
            </div>

            <motion.div className="te-preview-page-area" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: shouldReduceMotion ? 0 : 0.38, delay: shouldReduceMotion ? 0 : 0.32 }}>
              {pageError ? <div className="te-preview-page-error" role="alert">{pageError}</div> : null}
              <PdfPageCanvas document={pdfDocument} pageNumber={pageNumber} zoom={zoom} onRenderError={setPageError} />
            </motion.div>

            <footer className="te-preview-footer">
              <p>{t("privacy")}</p>
              <button type="button" onClick={() => { onReplace(); onClose(); }} disabled={isUploadActive}><RefreshCw aria-hidden="true" /> {t("replace")}</button>
            </footer>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return typeof window === "undefined" ? null : createPortal(drawer, window.document.body);
}
