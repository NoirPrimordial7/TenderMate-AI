import { HistoryTender, RiskLevel, TenderAnalysis } from "@/domain/tender/types";
import { apiRequest, ApiError } from "@/services/api";

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
  if (record.risk_level === "High") return "High Risk";
  if (record.risk_level === "Medium" || record.status !== "analyzed") return "Needs Review";
  return "Analyzed";
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

export class BackendTenderRepository {
  async getAllTenders() {
    const records = await apiRequest<BackendTenderRecord[]>("/tenders");
    return records.map(toHistoryTender);
  }

  async getLatestTender() {
    try {
      const record = await apiRequest<BackendTenderRecord>("/tenders/latest");
      return analysisFromRecord(record);
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
      return analysisFromRecord(record);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }

      throw error;
    }
  }
}

export const backendTenderRepository = new BackendTenderRepository();
