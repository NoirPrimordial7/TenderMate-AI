import { describe, expect, it } from "vitest";
import { adminCacheKey, isAdminKey } from "@/cache/keys";

describe("admin cache isolation", () => {
  it("scopes keys by staff, role, resource, filter, cursor and locale", () => {
    const key = adminCacheKey("staff-1", "support", "users", "active", "cursor-2", "mr");
    expect(key).toEqual(["admin", "staff-1", "support", "users", "active", "cursor-2", "mr"]);
    expect(isAdminKey(key)).toBe(true);
  });
  it("does not reuse customer keys", () => {
    expect(isAdminKey(["private", "staff-1", "dashboard", "en"])).toBe(false);
  });
});
