import { HistoryTender, RiskLevel, TenderAnalysis } from "@/domain/tender/types";

export function calculateFitScore(tender: TenderAnalysis) {
  return tender.decision.overallFitScore;
}

export function calculateRiskBadge(tender: TenderAnalysis): RiskLevel {
  return tender.decision.riskLevel;
}

export function calculateDocumentCount(tender: TenderAnalysis) {
  const total = tender.documents.length;
  const ready = tender.documents.filter((document) => document.status === "Ready").length;

  return { ready, total, label: `${ready}/${total}` };
}

export function calculateMissingRequirements(tender: TenderAnalysis) {
  const missingDocuments = tender.documents.filter((document) => document.status === "Missing").length;
  const unverifiedEligibility = tender.eligibility.filter((requirement) => requirement.userStatus !== "Ready").length;

  return missingDocuments + unverifiedEligibility;
}

export function toHistoryTender(
  tender: TenderAnalysis,
  meta: Pick<HistoryTender, "uploadDate" | "status">
): HistoryTender {
  return {
    id: tender.id,
    tenderTitle: tender.snapshot.title,
    organization: tender.snapshot.organization,
    uploadDate: meta.uploadDate,
    deadline: tender.snapshot.submissionDeadline,
    status: meta.status,
    riskLevel: calculateRiskBadge(tender),
    fitScore: calculateFitScore(tender),
    category: tender.snapshot.category
  };
}
