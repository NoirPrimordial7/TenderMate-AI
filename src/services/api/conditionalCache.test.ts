// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, clearConditionalApiCache } from "@/services/api";

afterEach(() => {
  clearConditionalApiCache();
  vi.unstubAllGlobals();
});

describe("memory-only conditional API cache", () => {
  it("uses If-None-Match and serves the unchanged in-memory value on 304", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ value: 3 }), { status: 200, headers: { "content-type": "application/json", etag: '"version-1"' } }))
      .mockResolvedValueOnce(new Response(null, { status: 304, headers: { etag: '"version-1"' } }));
    vi.stubGlobal("fetch", fetcher);
    expect(await apiRequest("/test", { auth: false, conditionalKey: "user-1:test" })).toEqual({ value: 3 });
    expect(await apiRequest("/test", { auth: false, conditionalKey: "user-1:test" })).toEqual({ value: 3 });
    const secondHeaders = fetcher.mock.calls[1][1].headers as Headers;
    expect(secondHeaders.get("If-None-Match")).toBe('"version-1"');
  });

  it("does not share conditional values across user-scoped keys", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ owner: "one" }), { status: 200, headers: { "content-type": "application/json", etag: '"one"' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ owner: "two" }), { status: 200, headers: { "content-type": "application/json", etag: '"two"' } }));
    vi.stubGlobal("fetch", fetcher);
    await apiRequest("/test", { auth: false, conditionalKey: "user-1:test" });
    await apiRequest("/test", { auth: false, conditionalKey: "user-2:test" });
    const secondHeaders = fetcher.mock.calls[1][1].headers as Headers;
    expect(secondHeaders.has("If-None-Match")).toBe(false);
  });
});
