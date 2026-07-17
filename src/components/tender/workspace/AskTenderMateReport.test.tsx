// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TenderRecordView } from "@/domain/tender/types";
import { AskTenderMateReport } from "./AskTenderMateReport";

const api = vi.hoisted(() => ({ fetchHistory: vi.fn(), ask: vi.fn(), clear: vi.fn() }));

vi.mock("@/services/TenderAssistantService", () => ({
  fetchTenderQuestionHistory: api.fetchHistory,
  askTenderQuestion: api.ask,
  clearTenderQuestionHistory: api.clear
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ analysisLocale: "en", setAnalysisLocale: vi.fn() }),
  useTranslations: () => (key: string, values?: Record<string, string | number>) => values ? `${key} ${Object.values(values).join(" ")}` : key
}));

const source = { page: 4, clause: "6.1", title: "Documents", text: "GST registration is required" };
const tender = {
  id: "tender-1", title: "Tender", status: "analyzed", createdAt: "", updatedAt: "", pageCount: 8,
  analysis: {
    id: "tender-1", snapshot: { title: "Tender", tenderId: "NIT-1", organization: "Authority", location: "Pune", category: "Works", estimatedValue: "₹1 lakh", emdAmount: "₹2,000", submissionDeadline: "2026-08-28", contractDuration: "30 days" },
    decision: { shouldApply: "Review", recommendation: "Verify documents", overallFitScore: 70, riskLevel: "Medium", deadlineUrgency: "Medium", missingCriticalRequirements: 1 },
    scores: [], beforeApply: [], documents: [{ name: "GST", priority: "Required", status: "Not Verified", source }], eligibility: [], financials: [], technical: [], dates: [], risks: [], missingInformation: [], departmentQuestions: [], proposalDraft: ""
  }
} as TenderRecordView;

function renderAssistant(onSource = vi.fn()) {
  render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><AskTenderMateReport tender={tender} onSource={onSource}/></SWRConfig>);
  return onSource;
}

beforeEach(() => {
  api.fetchHistory.mockResolvedValue({ tender_id: tender.id, messages: [] });
  api.ask.mockReset();
  api.clear.mockResolvedValue(undefined);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => cleanup());

describe("AskTenderMateReport", () => {
  it("renders the multilingual empty state and available suggestions", async () => {
    renderAssistant();
    expect(await screen.findByText("emptyTitle")).toBeTruthy();
    expect(screen.getByRole("option", { name: "English" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "हिंदी" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "मराठी" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /suggestDocuments/ })).toBeTruthy();
  });

  it("submits a question, shows loading, renders the grounded answer, and opens its citation", async () => {
    let resolveAnswer!: (value: unknown) => void;
    api.ask.mockReturnValue(new Promise((resolve) => { resolveAnswer = resolve; }));
    const onSource = renderAssistant();
    await screen.findByText("emptyTitle");
    await userEvent.type(screen.getByLabelText("composerLabel"), "Which documents are mandatory?");
    await userEvent.click(screen.getByRole("button", { name: "send" }));
    expect(screen.getByText("grounding")).toBeTruthy();
    resolveAnswer({ answer: "GST registration is mandatory.", language: "en", scope_status: "accepted", confidence: .9, citations: [{ page: 4, clause: "6.1", title: "Documents", quote: "GST registration is required", confidence: .95, extraction_method: "text" }], not_found: false, conversation_id: "conversation-1", message_id: "answer-1" });
    expect(await screen.findByText("GST registration is mandatory.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /GST registration is required/ }));
    expect(onSource).toHaveBeenCalledWith(expect.objectContaining({ page: 4, clause: "6.1", text: "GST registration is required" }));
  });

  it("renders a deterministic unrelated-question response without citations", async () => {
    api.ask.mockResolvedValue({ answer: "I can only answer questions about this tender and its connected documents.", language: "en", scope_status: "rejected", confidence: null, citations: [], not_found: false, conversation_id: "conversation-2", message_id: "answer-2" });
    renderAssistant();
    await screen.findByText("emptyTitle");
    fireEvent.change(screen.getByLabelText("composerLabel"), { target: { value: "Tell me a joke" } });
    fireEvent.submit(screen.getByLabelText("composerLabel").closest("form")!);
    expect(await screen.findByText("I can only answer questions about this tender and its connected documents.")).toBeTruthy();
    expect(screen.queryByText("verifiedSources")).toBeNull();
  });

  it("shows errors and confirms private-history deletion", async () => {
    api.fetchHistory.mockResolvedValue({ tender_id: tender.id, messages: [{ id: "u1", conversation_id: "c1", tender_id: tender.id, role: "user", content: "EMD?", language: "en", scope_status: "accepted", confidence: null, citations: [], not_found: false, created_at: new Date().toISOString() }] });
    api.clear.mockRejectedValueOnce(new Error("offline"));
    renderAssistant();
    await screen.findByText("EMD?");
    await userEvent.click(screen.getByRole("button", { name: /clearHistory/ }));
    expect(screen.getByText("clearConfirm")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "confirmClear" }));
    await waitFor(() => expect(screen.getByText("errorNetwork")).toBeTruthy());
  });
});
