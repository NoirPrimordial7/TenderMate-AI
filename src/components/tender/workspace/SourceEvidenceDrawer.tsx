"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslations } from "@/contexts/LocaleContext";
import type { SourceReference } from "@/domain/tender/types";

const StoredPdfViewer = dynamic(() => import("@/components/tender/StoredPdfViewer").then((module) => module.StoredPdfViewer), { loading: () => <div className="tm-source-loading" /> });

export function SourceEvidenceDrawer({ tenderId, pageCount, source, open, onClose, onOpenFull }: { tenderId: string; pageCount?: number | null; source: SourceReference | null; open: boolean; onClose: () => void; onOpenFull: () => void }) {
  const t = useTranslations("workspaceV2");
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const controls = Array.from(drawerRef.current.querySelectorAll<HTMLElement>("button, a[href], iframe, [tabindex]:not([tabindex='-1'])"))
        .filter((element) => !element.hasAttribute("disabled"));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [onClose, open]);
  if (!open) return null;
  return (
    <div className="tm-v2-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside ref={drawerRef} className="tm-v2-source-drawer" role="dialog" aria-modal="true" aria-labelledby="source-drawer-title">
        <div className="tm-v2-drawer-head"><div><p className="tm-eyebrow">{t("sourceEvidence")}</p><h2 id="source-drawer-title">{source?.title || t("sourcePdf")}</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label={t("closeSource")}><X aria-hidden="true" /></button></div>
        <StoredPdfViewer tenderId={tenderId} source={source} pageCount={pageCount} />
        <button type="button" className="tm-v2-full-source" onClick={onOpenFull}>{t("openFullSource")}</button>
      </aside>
    </div>
  );
}
