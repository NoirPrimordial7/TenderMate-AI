"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Upload } from "lucide-react";
import LoadingState from "@/components/LoadingState";

const loadingMessages = ["Extracting PDF...", "Analyzing eligibility...", "Finding risks...", "Preparing dashboard..."];

export default function UploadCard() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const setFile = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    setFile(event.dataTransfer.files?.[0]);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0]);
  };

  const analyzeTender = () => {
    setIsLoading(true);
    setLoadingStep(0);
    loadingMessages.forEach((_, index) => {
      window.setTimeout(() => setLoadingStep(index), index * 650);
    });
    window.setTimeout(() => router.push("/dashboard"), loadingMessages.length * 650 + 250);
  };

  return (
    <section className="card w-full max-w-xl p-6 sm:p-8" aria-labelledby="upload-title">
      <div className="mb-6">
        <p className="muted-label">Tender PDF analysis</p>
        <h1 id="upload-title" className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
          Upload tender document
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Upload a government tender PDF to get eligibility, documents, risks, financial terms, and source references.
        </p>
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition ${
          isDragging ? "border-gray-950 bg-gray-100" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <input type="file" accept="application/pdf,.pdf" onChange={handleChange} className="sr-only" />
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
          <Upload className="h-5 w-5 text-gray-700" aria-hidden="true" />
        </span>
        <span className="mt-4 text-base font-semibold text-gray-950">Drag and drop PDF here</span>
        <span className="mt-1 text-sm text-gray-500">or click to browse your computer</span>
      </label>

      {fileName ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <FileText className="h-5 w-5 flex-none text-gray-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-950">{fileName}</p>
            <p className="text-xs text-gray-500">Ready for mock analysis</p>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={analyzeTender}
        disabled={!fileName || isLoading}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {isLoading ? "Analyzing tender..." : "Analyze Tender"}
      </button>
      {isLoading ? <LoadingState message={loadingMessages[loadingStep]} /> : null}
    </section>
  );
}
