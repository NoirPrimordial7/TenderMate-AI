import type { HistoryTender, TenderAnalysis, TenderRecordView } from "@/domain/tender/types";

export type TenderProcessState = "uploaded" | "extracting" | "extracted" | "analyzing" | "analyzed" | "failed";

export type ProcessingStageId =
  | "uploaded"
  | "validated"
  | "extracting"
  | "text-detected"
  | "ocr-required"
  | "content-ready"
  | "analyzing"
  | "verifying"
  | "ready";

export type ProcessingStageState = "complete" | "active" | "pending" | "warning" | "failed";

export type ProcessingStage = {
  id: ProcessingStageId;
  state: ProcessingStageState;
};

export function getProcessState(tender: TenderRecordView, active?: "extracting" | "analyzing" | null): TenderProcessState {
  if (active) return active;
  if (tender.analysis || tender.status === "analyzed") return "analyzed";
  if (tender.status === "extracted") return "extracted";
  if (tender.status === "failed" || tender.status === "upload_failed") return "failed";
  return "uploaded";
}

export function getProcessingStages(tender: TenderRecordView, active?: "extracting" | "analyzing" | null): ProcessingStage[] {
  const state = getProcessState(tender, active);
  const hasText = Boolean(tender.extractedTextPreview);
  const ocrUsed = Boolean(tender.ocrUsed || tender.extractionMethod === "gemini_ocr" || tender.extractionMethod === "mixed");
  const extracted = state === "extracted" || state === "analyzing" || state === "analyzed" || (state === "failed" && (tender.pageCount ?? 0) > 0);
  const analyzed = state === "analyzed";
  const extractionFailed = state === "failed" && !extracted;
  const analysisFailed = state === "failed" && extracted;

  return [
    { id: "uploaded", state: "complete" },
    { id: "validated", state: "complete" },
    { id: "extracting", state: extractionFailed ? "failed" : active === "extracting" ? "active" : extracted ? "complete" : "pending" },
    { id: "text-detected", state: extracted ? (hasText ? "complete" : "warning") : "pending" },
    { id: "ocr-required", state: extracted && !hasText && !ocrUsed ? "warning" : extracted ? "complete" : "pending" },
    { id: "content-ready", state: extracted && hasText ? "complete" : "pending" },
    { id: "analyzing", state: analysisFailed ? "failed" : active === "analyzing" ? "active" : analyzed ? "complete" : "pending" },
    { id: "verifying", state: analyzed ? "complete" : "pending" },
    { id: "ready", state: analyzed ? "complete" : "pending" }
  ];
}

export function getMissingDocumentCount(analysis?: TenderAnalysis | null) {
  if (!analysis) return null;
  return analysis.documents.filter((document) => document.status === "Missing").length;
}

export function getPriorityTender(items: HistoryTender[]) {
  const available = items.filter((item) => item.status !== "Failed");
  return [...available].sort((left, right) => {
    const leftTime = Date.parse(left.deadlineRaw ?? left.deadline);
    const rightTime = Date.parse(right.deadlineRaw ?? right.deadline);
    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return right.updatedAt.localeCompare(left.updatedAt);
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return leftTime - rightTime;
  })[0] ?? items[0] ?? null;
}

export function formatIndiaDate(value: string | null | undefined, locale = "en-IN") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) return null;
  return Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
}
