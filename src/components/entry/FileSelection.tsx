"use client";

import { CheckCircle2, CircleAlert, Eye, RefreshCw, Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useTranslations } from "@/contexts/LocaleContext";

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileSelectionProps = {
  file: File;
  disabled?: boolean;
  pageCount: number | null;
  documentError?: string;
  thumbnail: ReactNode;
  onPreview: () => void;
  onRemove: () => void;
  onReplace: () => void;
};

export function FileSelection({
  file,
  disabled,
  pageCount,
  documentError,
  thumbnail,
  onPreview,
  onRemove,
  onReplace
}: FileSelectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const t = useTranslations("upload");

  return (
    <motion.div
      layout
      className="te-file-selection"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="te-file-thumbnail" aria-label={t("firstPage")}>{thumbnail}</div>
      <div className="te-file-details">
        <div className={`te-file-validity ${documentError ? "te-file-validity-error" : ""}`}>
          {documentError ? <CircleAlert className="h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          <span>{documentError ? t("previewUnavailable") : pageCount ? t("validated") : t("reading")}</span>
        </div>
        <p className="te-file-name" title={file.name}>{file.name}</p>
        <p className="te-file-meta">{formatFileSize(file.size)}{pageCount ? ` · ${pageCount} ${pageCount === 1 ? "page" : "pages"}` : ""}</p>
        {documentError ? <p className="te-file-error">{documentError}</p> : null}
      </div>
      <div className="te-file-actions">
        <button type="button" onClick={onPreview} disabled={disabled || !pageCount || Boolean(documentError)} className="te-file-preview"><Eye className="h-4 w-4" aria-hidden="true" /><span>{t("preview")}</span></button>
        <button type="button" onClick={onReplace} disabled={disabled}><RefreshCw className="h-4 w-4" aria-hidden="true" /><span>{t("replace")}</span></button>
        <button type="button" onClick={onRemove} disabled={disabled} className="te-file-remove"><Trash2 className="h-4 w-4" aria-hidden="true" /><span>{t("remove")}</span></button>
      </div>
    </motion.div>
  );
}
