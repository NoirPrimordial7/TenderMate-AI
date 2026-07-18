import { describe, expect, it } from "vitest";
import { BRAND, absoluteBrandUrl } from "@/config/brand";

describe("public brand configuration", () => {
  it("uses the NividaIQ public identity and canonical domain", () => {
    expect(BRAND.name).toBe("NividaIQ");
    expect(BRAND.primaryDomain).toBe("nividaiq.in");
    expect(absoluteBrandUrl("/demo")).toContain("nividaiq.in/demo");
  });

  it("contains all launch taglines", () => {
    expect(Object.keys(BRAND.tagline).sort()).toEqual(["en", "hi", "mr"]);
  });
});
