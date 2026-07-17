import { describe, expect, it, vi } from "vitest";
import type { HistoryTender } from "@/domain/tender/types";
import { getPriorityTender } from "./tenderWorkspace";

const item = (overrides: Partial<HistoryTender>): HistoryTender => ({ id: "1", tenderTitle: "Tender", organization: "Org", uploadDate: "", uploadDateRaw: "2026-01-01", updatedDate: "", updatedAt: "2026-01-01", deadline: "2026-12-01", deadlineRaw: "2026-12-01", status: "Analyzed", riskLevel: "Low", fitScore: 70, category: "Works", ...overrides });

describe("priority tender selection", () => {
  it("excludes confirmed non-tender files", () => { vi.setSystemTime(new Date("2026-07-17")); const result = getPriorityTender([item({ id: "resume", documentType: "non_tender", status: "Invalid", deadlineRaw: "2026-07-18" }), item({ id: "tender", documentType: "tender", deadlineRaw: "2026-07-20" })]); expect(result?.id).toBe("tender"); vi.useRealTimers(); });
  it("prefers an active deadline over an expired tender", () => { vi.setSystemTime(new Date("2026-07-17")); const result = getPriorityTender([item({ id: "expired", deadlineRaw: "2026-07-01" }), item({ id: "active", deadlineRaw: "2026-07-19" })]); expect(result?.id).toBe("active"); vi.useRealTimers(); });
  it("returns null when no valid tender exists", () => expect(getPriorityTender([item({ status: "Invalid", documentType: "non_tender" })])).toBeNull());
});
