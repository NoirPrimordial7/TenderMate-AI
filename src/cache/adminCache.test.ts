// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminCacheKey, isAdminKey, staffPermissionSignature } from "@/cache/keys";
import { ADMIN_AUTHORIZATION_INVALIDATED_EVENT, apiRequest } from "@/services/api";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("admin cache isolation", () => {
  it("scopes keys by staff, role, resource, filter, cursor and locale", () => {
    const permissions = staffPermissionSignature("support");
    const key = adminCacheKey("staff-1", "support", permissions, "users", "active", "cursor-2", "mr");
    expect(key).toEqual(["admin", "staff-1", "support", permissions, "users", "active", "cursor-2", "mr"]);
    expect(isAdminKey(key)).toBe(true);
  });
  it("does not reuse customer keys", () => {
    expect(isAdminKey(["private", "staff-1", "dashboard", "en"])).toBe(false);
  });
  it("invalidates cached authorization when the server rejects current permissions", async () => {
    const listener = vi.fn();
    window.addEventListener(ADMIN_AUTHORIZATION_INVALIDATED_EVENT, listener);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Permission denied." }), { status: 403, headers: { "content-type": "application/json" } })));
    await expect(apiRequest("/admin/users/target/credits", { method: "POST", body: {} })).rejects.toMatchObject({ status: 403 });
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(ADMIN_AUTHORIZATION_INVALIDATED_EVENT, listener);
  });
});
