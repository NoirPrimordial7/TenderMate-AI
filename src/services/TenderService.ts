import { HistoryTender } from "@/domain/tender/types";
import { ITenderRepository } from "@/repositories/interfaces/ITenderRepository";
import { tenderRepository } from "@/repositories/TenderRepository";
import {
  calculateDocumentCount,
  calculateFitScore,
  calculateMissingRequirements,
  calculateRiskBadge,
  toHistoryTender
} from "@/services/tenderTransforms";

const historyMeta: Pick<HistoryTender, "uploadDate" | "status">[] = [
  { uploadDate: "12 June 2026", status: "Needs Review" },
  { uploadDate: "11 June 2026", status: "High Risk" },
  { uploadDate: "09 June 2026", status: "Analyzed" },
  { uploadDate: "08 June 2026", status: "Needs Review" }
];

export class TenderService {
  constructor(private readonly repository: ITenderRepository = tenderRepository) {}

  getDashboardTender() {
    return this.repository.getLatestTender();
  }

  getTenderHistory() {
    return this.repository.getAllTenders().map((tender, index) =>
      toHistoryTender(tender, historyMeta[index] ?? { uploadDate: "Not available", status: "Analyzed" })
    );
  }

  getTenderDetails(id: string) {
    return this.repository.getTenderById(id);
  }

  getRiskSummary(id: string) {
    const tender = this.repository.getTenderById(id);

    if (!tender) return undefined;

    return {
      riskLevel: calculateRiskBadge(tender),
      highRiskCount: tender.risks.filter((risk) => risk.level === "High").length,
      mediumRiskCount: tender.risks.filter((risk) => risk.level === "Medium").length,
      lowRiskCount: tender.risks.filter((risk) => risk.level === "Low").length
    };
  }

  getTenderStats() {
    const tenders = this.repository.getAllTenders();
    const averageFitScore = Math.round(
      tenders.reduce((total, tender) => total + calculateFitScore(tender), 0) / tenders.length
    );
    const missingRequirements = tenders.reduce((total, tender) => total + calculateMissingRequirements(tender), 0);
    const documentCounts = tenders.map(calculateDocumentCount);

    return {
      totalTenders: tenders.length,
      averageFitScore,
      missingRequirements,
      documentCounts
    };
  }

  getAllTenderIds() {
    return this.repository.getAllTenders().map((tender) => tender.id);
  }
}

export const tenderService = new TenderService();
