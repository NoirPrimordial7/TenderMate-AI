"use client";

import { FileText, RefreshCw, Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileSelectionProps = { file: File; disabled?: boolean; onRemove: () => void; onReplace: () => void };

export function FileSelection({ file, disabled, onRemove, onReplace }: FileSelectionProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div className="te-file-selection" initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: shouldReduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}>
      <span className="te-file-icon"><FileText className="h-5 w-5" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{file.name}</p><p className="te-file-meta">{formatFileSize(file.size)} · ready to analyse</p></div>
      <div className="te-file-actions">
        <button type="button" onClick={onReplace} disabled={disabled} aria-label="Replace selected PDF"><RefreshCw className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" onClick={onRemove} disabled={disabled} aria-label="Remove selected PDF" className="te-file-remove"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
      </div>
    </motion.div>
  );
}
