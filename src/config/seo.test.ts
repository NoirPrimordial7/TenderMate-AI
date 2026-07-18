import { describe, expect, it } from "vitest";
import { buildPublicStructuredData, SEO_BY_LOCALE } from "@/config/seo";

describe("public search configuration", () => {
  it("defines brand-first localized metadata for every supported language", () => {
    expect(Object.keys(SEO_BY_LOCALE).sort()).toEqual(["en", "hi", "mr"]);
    for (const seo of Object.values(SEO_BY_LOCALE)) {
      expect(seo.title).toMatch(/^NividaIQ \|/);
      expect(seo.description.length).toBeGreaterThan(80);
      expect(seo.keywords).toContain("NividaIQ");
    }
  });

  it("publishes WebSite identity data for search engines without fake ratings or offers", () => {
    const graph = buildPublicStructuredData("en")["@graph"];
    expect(graph.map((entry) => entry["@type"])).toEqual(["Organization", "WebSite", "SoftwareApplication"]);
    expect(JSON.stringify(graph)).not.toContain("aggregateRating");
    expect(JSON.stringify(graph)).not.toContain("offers");
  });
});
