"use client";

import type { ChangeEvent, DragEvent, RefObject } from "react";
import { FileUp } from "lucide-react";

type UploadDropzoneProps = { disabled?: boolean; inputRef: RefObject<HTMLInputElement | null>; isDragging: boolean; onDraggingChange: (value: boolean) => void; onFile: (file?: File) => void };

export function UploadDropzone({ disabled, inputRef, isDragging, onDraggingChange, onFile }: UploadDropzoneProps) {
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
  return (
    <div className={`te-dropzone ${isDragging ? "te-dropzone-active" : ""}`} onDragEnter={(event) => { event.preventDefault(); if (!disabled) onDraggingChange(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDraggingChange(false); }} onDrop={handleDrop} aria-describedby="te-upload-guidance">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={handleChange} className="sr-only" tabIndex={-1} aria-hidden="true" disabled={disabled} />
      <span className="te-dropzone-icon"><FileUp className="h-5 w-5" aria-hidden="true" /></span>
      <div className="te-dropzone-text"><p className="te-dropzone-title">Drop your tender PDF here</p><p id="te-upload-guidance" className="te-dropzone-copy">or choose it from your device</p></div>
      <button type="button" className="te-secondary-button" onClick={() => inputRef.current?.click()} disabled={disabled}>Browse PDF</button>
    </div>
  );
}
