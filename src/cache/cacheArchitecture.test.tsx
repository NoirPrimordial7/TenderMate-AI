// @vitest-environment jsdom
import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheKeys, isPrivateKeyForUser, isTenderResource } from "@/cache/keys";
import { mergeChatMessages } from "@/cache/chat";
import { clearPersistentPrivateCache, containsProhibitedPersistentData, readHistorySnapshot, writeHistorySnapshot } from "@/cache/persistent";
import { isLowResourceRuntime, PRIVATE_SWR_POLICY, visibilityAwareInterval } from "@/cache/policy";
import { publishCacheEvent } from "@/cache/events";
import type { TenderAssistantMessage } from "@/domain/tender/assistant";
import type { HistoryTender } from "@/domain/tender/types";
import { useTenderHistory } from "@/hooks/useTenderHistory";
import { useTenderRecord } from "@/hooks/useTenderRecord";
import { tenderService } from "@/services/TenderService";

const item = (id: string, title = "Cached tender"): HistoryTender => ({
  id, tenderTitle: title, organization: "Authority", uploadDate: "18 July 2026", uploadDateRaw: "2026-07-18T00:00:00Z",
  updatedDate: "18 July 2026", updatedAt: "2026-07-18T00:00:00Z", deadline: "20 July 2026", deadlineRaw: "2026-07-20T00:00:00Z",
  status: "Analyzed", riskLevel: "Low", fitScore: 80, category: "Works", recommendation: null, missingDocuments: 0
});

const wrapper = ({ children }: { children: React.ReactNode }) => <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig>;

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("cache-first architecture", () => {
  it("shows a user-scoped cached dashboard/history snapshot before background refresh completes", async () => {
    writeHistorySnapshot("user-1", [item("tender-1")]);
    let resolve!: (value: { items: HistoryTender[]; nextCursor: null }) => void;
    vi.spyOn(tenderService, "getBackendTenderPage").mockReturnValue(new Promise((done) => { resolve = done; }));
    const { result } = renderHook(() => useTenderHistory("user-1", "en"), { wrapper });
    expect(result.current.items[0]?.tenderTitle).toBe("Cached tender");
    expect(result.current.hasCachedData).toBe(true);
    await act(async () => resolve({ items: [item("tender-1", "Updated tender")], nextCursor: null }));
    await waitFor(() => expect(result.current.items[0]?.tenderTitle).toBe("Updated tender"));
  });

  it("preserves usable cached data when background refresh fails", async () => {
    writeHistorySnapshot("user-1", [item("tender-1")]);
    vi.spyOn(tenderService, "getBackendTenderPage").mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useTenderHistory("user-1", "en"), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.items.map((value) => value.id)).toEqual(["tender-1"]);
  });

  it("isolates snapshots and typed cache resources by user, locale, cursor, and report version", () => {
    writeHistorySnapshot("user-1", [item("tender-1")]);
    expect(readHistorySnapshot("user-2")).toBeUndefined();
    expect(cacheKeys.report("user-1", "tender-1", "2.0", "mr")).not.toEqual(cacheKeys.report("user-1", "tender-1", "1.0", "mr"));
    expect(cacheKeys.historyPage("user-1", "hi", "cursor", 40)).toContain("cursor");
    expect(isPrivateKeyForUser(cacheKeys.credits("user-1"), "user-2")).toBe(false);
    expect(isTenderResource(cacheKeys.tender("user-1", "tender-1", "en"), "user-1", "tender-2")).toBe(false);
  });

  it("clears private snapshots and never permits signed URLs or extracted/report payloads", () => {
    writeHistorySnapshot("user-1", [item("tender-1")]);
    clearPersistentPrivateCache("user-1");
    expect(readHistorySnapshot("user-1")).toBeUndefined();
    expect(containsProhibitedPersistentData('{"signed_url":"secret"}')).toBe(true);
    expect(containsProhibitedPersistentData('{"analysis_json":{}}')).toBe(true);
  });

  it("pauses polling when hidden/offline and reduces work on constrained devices", () => {
    expect(visibilityAwareInterval(true, false, false)).toBe(0);
    expect(visibilityAwareInterval(false, false, true)).toBe(0);
    expect(isLowResourceRuntime({ hardwareConcurrency: 2 } as Navigator)).toBe(true);
    expect(PRIVATE_SWR_POLICY.revalidateOnFocus).toBe(true);
    expect(PRIVATE_SWR_POLICY.revalidateOnReconnect).toBe(true);
    expect(Number(PRIVATE_SWR_POLICY.dedupingInterval)).toBeGreaterThan(0);
  });

  it("deduplicates incremental chat messages and preserves chronological order", () => {
    const base = { conversation_id: "c", tender_id: "t", language: "en", scope_status: "accepted", confidence: null, citations: [], not_found: false };
    const first: TenderAssistantMessage = { ...base, language: "en", scope_status: "accepted", id: "1", role: "user", content: "Question", created_at: "2026-01-01T00:00:00Z" };
    const second: TenderAssistantMessage = { ...base, language: "en", scope_status: "accepted", id: "2", role: "assistant", content: "Answer", created_at: "2026-01-01T00:00:01Z" };
    expect(mergeChatMessages([first], [first, second]).map((message) => message.id)).toEqual(["1", "2"]);
  });

  it("routes realtime-compatible events without broad cache payloads", () => {
    const listener = vi.fn();
    window.addEventListener("nividaiq:cache-event", listener);
    publishCacheEvent({ type: "tender-status", userId: "user-1", tenderId: "tender-1" });
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("nividaiq:cache-event", listener);
  });

  it("revalidates only the tender targeted by a realtime-compatible event", async () => {
    const spy = vi.spyOn(tenderService, "getBackendTenderDetails").mockImplementation(async (id) => ({ id, title: id, status: "analyzed", analysis: null, createdAt: "", updatedAt: "2026-07-18T00:00:00Z" }));
    renderHook(() => {
      const first = useTenderRecord("user-1", "tender-1", "en");
      const second = useTenderRecord("user-1", "tender-2", "en");
      return { first, second };
    }, { wrapper });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    act(() => publishCacheEvent({ type: "tender-status", userId: "user-1", tenderId: "tender-1" }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(3));
    expect(spy.mock.calls.filter(([id]) => id === "tender-1")).toHaveLength(2);
    expect(spy.mock.calls.filter(([id]) => id === "tender-2")).toHaveLength(1);
  });
});
