"use client";

import type { ChangeEvent, DragEvent, KeyboardEvent, MouseEvent, RefObject } from "react";
import { FileUp } from "lucide-react";
import { useTranslations } from "@/contexts/LocaleContext";

type UploadDropzoneProps = {
  disabled?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  isDragging: boolean;
  onDraggingChange: (value: boolean) => void;
  onFile: (file?: File) => void;
};

export function UploadDropzone({ disabled, inputRef, isDragging, onDraggingChange, onFile }: UploadDropzoneProps) {
  const t = useTranslations("upload");
  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    onDraggingChange(false);
    onFile(event.dataTransfer.files?.[0]);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    openPicker();
  };

  const handleBrowse = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    openPicker();
  };

  return (
    <div
      className={`te-dropzone ${isDragging ? "te-dropzone-active" : ""} ${disabled ? "te-dropzone-disabled" : ""}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={t("dropAria")}
      aria-describedby="te-upload-guidance"
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragEnter={(event) => { event.preventDefault(); if (!disabled) onDraggingChange(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDraggingChange(false); }}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleChange} className="sr-only" tabIndex={-1} disabled={disabled} />
      <span className="te-dropzone-icon"><FileUp className="h-5 w-5" aria-hidden="true" /></span>
      <div className="te-dropzone-text">
        <p className="te-dropzone-title">{t("dropTitle")}</p>
        <p id="te-upload-guidance" className="te-dropzone-copy">{t("dropSupport")}</p>
      </div>
      <button type="button" className="te-secondary-button" onClick={handleBrowse} disabled={disabled}>{t("browse")}</button>
    </div>
  );
}
