import {
  GeminiAnalysisResponse,
  HistoryTender,
  PDFExtractionResponse,
  RiskLevel,
  TenderAnalysis,
  TenderRecordView,
  UploadTenderResponse
} from "@/domain/tender/types";
import { apiRequest, apiUploadRequest, ApiError, UploadRequestOptions } from "@/services/api";

export type BackendTenderRecord = {
  id: string;
  title: string;
  organization?: string | null;
  category?: string | null;
  location?: string | null;
  deadline?: string | null;
  risk_level?: RiskLevel | null;
  fit_score?: number | null;
  status: string;
  analysis_json?: TenderAnalysis | null;
  original_file_name?: string | null;
  error_message?: string | null;
  extracted_text_preview?: string | null;
  page_count?: number | null;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function toHistoryStatus(record: BackendTenderRecord): HistoryTender["status"] {
  if (record.status === "failed" || record.status === "upload_failed") return "Failed";
  if (record.status === "extracted") return "Extracted";
  if (record.analysis_json || record.status === "analyzed") return "Analyzed";
  return "Uploaded";
}

function analysisFromRecord(record: BackendTenderRecord) {
  if (!record.analysis_json) return null;
  return { ...record.analysis_json, id: record.id };
}

function toHistoryTender(record: BackendTenderRecord): HistoryTender {
  const analysis = analysisFromRecord(record);

  return {
    id: record.id,
    tenderTitle: analysis?.snapshot.title ?? record.title,
    organization: analysis?.snapshot.organization ?? record.organization ?? "Not available",
    uploadDate: formatDate(record.created_at),
    deadline: analysis?.snapshot.submissionDeadline ?? record.deadline ?? "Not available",
    status: toHistoryStatus(record),
    riskLevel: analysis?.decision.riskLevel ?? record.risk_level ?? "Low",
    fitScore: analysis?.decision.overallFitScore ?? record.fit_score ?? 0,
    category: analysis?.snapshot.category ?? record.category ?? "Not available"
  };
}

function toTenderRecordView(record: BackendTenderRecord): TenderRecordView {
  const analysis = analysisFromRecord(record);

  return {
    id: record.id,
    title: analysis?.snapshot.title ?? record.title,
    status: record.status,
    analysis,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    originalFileName: record.original_file_name,
    errorMessage: record.error_message,
    extractedTextPreview: record.extracted_text_preview,
    pageCount: record.page_count
  };
}

export class BackendTenderRepository {
  async getAllTenders() {
    const records = await apiRequest<BackendTenderRecord[]>("/tenders");
    return records.map(toHistoryTender);
  }

  async getLatestTender() {
    try {
      const record = await apiRequest<BackendTenderRecord>("/tenders/latest");
      return toTenderRecordView(record);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async getTenderById(id: string) {
    try {
      const record = await apiRequest<BackendTenderRecord>(`/tenders/${id}`);
      return toTenderRecordView(record);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async uploadTenderPdf(file: File, options: UploadRequestOptions = {}) {
    const formData = new FormData();
    formData.append("file", file);

    return apiUploadRequest<UploadTenderResponse>("/tenders/upload", formData, options);
  }

  async extractTenderText(tenderId: string) {
    return apiRequest<PDFExtractionResponse>(`/tenders/${tenderId}/extract`, {
      method: "POST",
      body: {}
    });
  }

  async analyzeTender(tenderId: string) {
    return apiRequest<GeminiAnalysisResponse>(`/tenders/${tenderId}/analyze`, {
      method: "POST",
      body: {}
    });
  }
}

export const backendTenderRepository = new BackendTenderRepository();
