import {
  GeminiAnalysisResponse,
  DocumentType,
  DocumentValidationStatus,
  ExtractionMethod,
  HistoryTender,
  PDFExtractionResponse,
  RiskLevel,
  TenderAnalysis,
  TenderRecordView,
  TenderSourceResponse,
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
  extraction_method?: ExtractionMethod | null;
  ocr_used?: boolean | null;
  ocr_confidence?: number | null;
  document_type?: DocumentType | null;
  document_validation_status?: DocumentValidationStatus | null;
  document_validation_confidence?: number | null;
  document_validation_reason?: string | null;
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
  if (record.document_type === "non_tender" || record.document_validation_status === "invalid") return "Invalid";
  if (record.status === "failed" || record.status === "upload_failed") return "Failed";
  if (record.document_validation_status === "pending" && record.status === "extracted") return "Validating";
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
    uploadDateRaw: record.created_at,
    updatedDate: formatDate(record.updated_at),
    updatedAt: record.updated_at,
    deadline: analysis?.snapshot.submissionDeadline ?? record.deadline ?? "Not available",
    deadlineRaw: record.deadline,
    status: toHistoryStatus(record),
    riskLevel: analysis?.decision.riskLevel ?? record.risk_level ?? "Low",
    fitScore: analysis?.decision.overallFitScore ?? record.fit_score ?? 0,
    category: analysis?.snapshot.category ?? record.category ?? "Not available",
    recommendation: analysis?.decision.recommendation ?? null,
    missingDocuments: analysis ? analysis.documents.filter((document) => document.status === "Missing").length : null,
    documentType: record.document_type,
    documentValidationStatus: record.document_validation_status,
    documentValidationConfidence: record.document_validation_confidence,
    documentValidationReason: record.document_validation_reason
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
    pageCount: record.page_count,
    schemaVersion: analysis?.schemaVersion ?? "1.0",
    extractionMethod: record.extraction_method,
    ocrUsed: Boolean(record.ocr_used),
    ocrConfidence: record.ocr_confidence,
    documentType: record.document_type,
    documentValidationStatus: record.document_validation_status,
    documentValidationConfidence: record.document_validation_confidence,
    documentValidationReason: record.document_validation_reason
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

  async getTenderSource(tenderId: string) {
    return apiRequest<TenderSourceResponse>(`/tenders/${tenderId}/source`);
  }
}

export const backendTenderRepository = new BackendTenderRepository();
