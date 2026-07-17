import { describe, expect, it } from "vitest";
import type { TenderAnalysis } from "@/domain/tender/types";
import { aggregateRequirementStatuses, getFinancialChartItems, getReadinessScores, hasReadinessChartData, normalizeFinancialAmount, parseTenderDate, reportFromAnalysis } from "./tenderReport";

const source = { page: 1, clause: "1", title: "Clause", text: "Evidence" };
const baseAnalysis: TenderAnalysis = {
  id: "1", schemaVersion: "1.0", snapshot: { title: "T", tenderId: "1", organization: "O", location: "L", category: "C", estimatedValue: "Not specified", emdAmount: "Not specified", submissionDeadline: "Not specified", contractDuration: "Not specified" },
  decision: { shouldApply: "Review", recommendation: "Review", overallFitScore: 50, riskLevel: "Medium", deadlineUrgency: "Medium", missingCriticalRequirements: 0 }, scores: [], beforeApply: [],
  documents: [{ name: "A", priority: "Required", status: "Ready", source }, { name: "B", priority: "Required", status: "Not Verified", source }, { name: "C", priority: "Required", status: "Missing", source }], eligibility: [], financials: [], technical: [], dates: [], risks: [], missingInformation: [], departmentQuestions: [], proposalDraft: ""
};

describe("tender report helpers", () => {
  it("keeps Not Verified separate from Ready", () => expect(aggregateRequirementStatuses(baseAnalysis.documents)).toEqual({ ready: 1, notVerified: 1, missing: 1, total: 3 }));
  it("downgrades unproven schema-v1 Ready documents", () => expect(reportFromAnalysis(baseAnalysis).documents[0].status).toBe("Not Verified"));
  it("uses explicit v1 score labels without deriving false precision", () => { const scores = getReadinessScores({ ...baseAnalysis, scores: [{ label: "Document Readiness", value: 63, display: "63%" }] }); expect(scores.documentsScore).toBe(63); expect(scores.eligibilityScore).toBeNull(); expect(hasReadinessChartData(scores)).toBe(true); });
  it("normalizes common INR expressions", () => expect(normalizeFinancialAmount({ label: "EMD", value: "₹1.5 lakh", source })).toBe(150000));
  it("shows a financial chart only with valid numeric items", () => expect(getFinancialChartItems([{ label: "EMD", value: "₹10,000", source }, { label: "Fee", value: "Not specified", source }])).toHaveLength(1));
  it("does not treat turnover as upfront commitment", () => expect(getFinancialChartItems([{ label: "Turnover requirement", value: "₹2 crore", type: "Turnover", source }, { label: "EMD", value: "₹10,000", type: "EMD", source }])).toHaveLength(1));
  it("parses ISO dates and rejects ambiguous text", () => { expect(parseTenderDate("2026-08-28T17:00:00+05:30", "ignored")?.getFullYear()).toBe(2026); expect(parseTenderDate(null, "28 Aug")).toBeNull(); expect(parseTenderDate(null, "not a date")).toBeNull(); });
});
