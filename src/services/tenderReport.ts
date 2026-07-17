import type { FinancialItem, ReadinessScores, RequirementStatus, TenderAnalysis } from "@/domain/tender/types";

export type StatusCounts = Record<"ready" | "notVerified" | "missing" | "total", number>;

export function aggregateRequirementStatuses(items: Array<{ status: RequirementStatus }>): StatusCounts {
  return items.reduce<StatusCounts>((counts, item) => {
    counts.total += 1;
    if (item.status === "Ready") counts.ready += 1;
    else if (item.status === "Missing") counts.missing += 1;
    else counts.notVerified += 1;
    return counts;
  }, { ready: 0, notVerified: 0, missing: 0, total: 0 });
}

function scoreByKey(analysis: TenderAnalysis, key: string) {
  const normalized = key.toLowerCase();
  const match = analysis.scores.find((score) =>
    score.key?.toLowerCase() === normalized || score.label.toLowerCase().includes(normalized)
  );
  return match && Number.isFinite(match.value) ? Math.max(0, Math.min(100, match.value)) : null;
}

export function getReadinessScores(analysis: TenderAnalysis): ReadinessScores {
  return {
    eligibilityScore: analysis.readiness?.eligibilityScore ?? scoreByKey(analysis, "eligibility"),
    documentsScore: analysis.readiness?.documentsScore ?? scoreByKey(analysis, "document"),
    financialScore: analysis.readiness?.financialScore ?? scoreByKey(analysis, "financial"),
    technicalScore: analysis.readiness?.technicalScore ?? scoreByKey(analysis, "technical"),
    timelineScore: analysis.readiness?.timelineScore ?? scoreByKey(analysis, "timeline")
  };
}

export function hasReadinessChartData(scores: ReadinessScores) {
  return Object.values(scores).some((value) => typeof value === "number" && Number.isFinite(value));
}

export function normalizeFinancialAmount(item: FinancialItem): number | null {
  if (typeof item.normalizedAmount === "number" && Number.isFinite(item.normalizedAmount) && item.normalizedAmount >= 0) {
    return item.normalizedAmount;
  }
  if (typeof item.chartAmount === "number" && Number.isFinite(item.chartAmount) && item.chartAmount >= 0) {
    return item.chartAmount;
  }
  const source = item.value.replace(/,/g, "").toLowerCase();
  const match = source.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|thousand|k)?/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const multiplier = match[2]?.startsWith("cr") || match[2] === "crore" ? 10_000_000
    : match[2]?.startsWith("la") ? 100_000
      : match[2] === "thousand" || match[2] === "k" ? 1_000
        : 1;
  return amount * multiplier;
}

export function getFinancialChartItems(items: FinancialItem[]) {
  return items
    .filter((item) => {
      const type = item.type?.toLowerCase() ?? "";
      const label = item.label.toLowerCase();
      return !type.includes("turnover")
        && !type.includes("estimated value")
        && !label.includes("turnover")
        && !label.includes("estimated tender value");
    })
    .map((item) => ({ item, amount: normalizeFinancialAmount(item) }))
    .filter((entry): entry is { item: FinancialItem; amount: number } => entry.amount !== null && entry.amount > 0);
}

export function parseTenderDate(isoDate: string | null | undefined, original: string) {
  const candidate = isoDate || (/\b\d{4}\b/.test(original) ? original : "");
  if (!candidate) return null;
  const timestamp = Date.parse(candidate);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

export function reportFromAnalysis(analysis: TenderAnalysis): TenderAnalysis {
  return {
    ...analysis,
    schemaVersion: analysis.schemaVersion || "1.0",
    decision: {
      ...analysis.decision,
      positiveFactors: analysis.decision.positiveFactors ?? [],
      blockers: analysis.decision.blockers ?? [],
      uncertainties: analysis.decision.uncertainties ?? [],
      explanation: analysis.decision.explanation ?? analysis.decision.recommendation
    },
    analysisSummary: analysis.analysisSummary ?? {
      executiveSummary: analysis.decision.recommendation,
      strongestReasonToApply: "",
      strongestReasonNotToApply: "",
      nextBestAction: analysis.beforeApply[0]?.label ?? ""
    },
    readiness: getReadinessScores(analysis),
    documents: analysis.documents.map((item) => ({
      ...item,
      status: item.userVerified === true ? "Ready" : item.userVerified === false ? "Missing" : item.status === "Ready" && analysis.schemaVersion !== "2.0" ? "Not Verified" : item.status,
      userVerified: item.userVerified ?? null
    }))
  };
}
