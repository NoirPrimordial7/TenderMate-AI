import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENTS, LEGAL_SLUGS } from "@/content/legal";

const locales = ["en", "hi", "mr"] as const;

describe("public launch content", () => {
  it("contains complete static legal content in every supported locale", () => {
    expect(LEGAL_SLUGS).toHaveLength(10);
    for (const slug of LEGAL_SLUGS) {
      const document = LEGAL_DOCUMENTS[slug];
      for (const locale of locales) {
        expect(document.title[locale].trim()).not.toBe("");
        expect(document.summary[locale].trim()).not.toBe("");
        expect(document.sections.length).toBeGreaterThan(0);
        for (const section of document.sections) {
          expect(section.title[locale].trim()).not.toBe("");
          expect(section.body[locale].trim()).not.toBe("");
        }
      }
    }
    expect(LEGAL_DOCUMENTS.terms.sections).toHaveLength(38);
  });

  it("keeps the public demo static and independent of private API services", () => {
    const source = readFileSync(new URL("../components/launch/PublicDemo.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/apiRequest|tenderService|supabase|fetch\s*\(/i);
    expect(source).toContain('t("demoLabel")');
  });
});
