"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useTranslations } from "@/contexts/LocaleContext";

type PdfPageCanvasProps = {
  document: PDFDocumentProxy;
  pageNumber: number;
  zoom?: number;
  variant?: "thumbnail" | "viewer";
  onRenderError?: (message: string) => void;
};

export function PdfPageCanvas({
  document,
  pageNumber,
  zoom = 1,
  variant = "viewer",
  onRenderError
}: PdfPageCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [isRendering, setIsRendering] = useState(true);
  const [renderError, setRenderError] = useState("");
  const t = useTranslations("pdfViewer");

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateWidth = () => setAvailableWidth(Math.max(1, frame.clientWidth));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || availableWidth <= 0) return;

    let cancelled = false;
    let renderTask: RenderTask | null = null;
    setIsRendering(true);
    setRenderError("");

    const renderPage = async () => {
      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = availableWidth / baseViewport.width;
        const cssScale = Math.max(0.1, fitScale * zoom);
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const renderViewport = page.getViewport({ scale: cssScale * outputScale });

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${Math.floor(baseViewport.width * cssScale)}px`;
        canvas.style.height = `${Math.floor(baseViewport.height * cssScale)}px`;

        renderTask = page.render({ canvas, viewport: renderViewport });
        await renderTask.promise;
        if (!cancelled) setIsRendering(false);
      } catch (error) {
        if (cancelled || (error instanceof Error && error.name === "RenderingCancelledException")) return;
        const message = t("pageError");
        setRenderError(message);
        setIsRendering(false);
        onRenderError?.(message);
      }
    };

    void renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [availableWidth, document, onRenderError, pageNumber, t, zoom]);

  return (
    <div ref={frameRef} className={`te-pdf-canvas-frame te-pdf-canvas-${variant}`}>
      {isRendering ? <div className="te-pdf-canvas-loading" role="status"><span />{t("pageLoading")}</div> : null}
      {renderError ? <div className="te-pdf-canvas-error" role="alert">{renderError}</div> : null}
      <canvas ref={canvasRef} aria-label={t("canvasLabel", { page: pageNumber })} />
    </div>
  );
}
