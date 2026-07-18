import type { AppLocale } from "@/i18n/config";

const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "NividaIQ",
  legalDisplayName: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "NividaIQ",
  shortDescription: "India-first AI-assisted tender analysis and bidder decision support.",
  primaryDomain: "nividaiq.in",
  appUrl: configuredUrl || "https://nividaiq.in",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "",
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() || "",
  grievanceEmail: process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL?.trim() || "",
  beta: true,
  tagline: {
    en: "Understand the tender before you bid.",
    hi: "बोली लगाने से पहले निविदा को समझें।",
    mr: "बोली सादर करण्यापूर्वी निविदा समजून घ्या."
  } satisfies Record<AppLocale, string>,
  legalDocuments: {
    terms: { version: "1.0", effectiveDate: process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE || "Pending legal review" },
    privacy: { version: "1.0", effectiveDate: process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE || "Pending legal review" },
    ai_disclaimer: { version: "1.0", effectiveDate: process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE || "Pending legal review" }
  },
  social: {
    x: process.env.NEXT_PUBLIC_SOCIAL_X_URL || "",
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL || ""
  }
} as const;

export function absoluteBrandUrl(path = "/") {
  return new URL(path, BRAND.appUrl).toString();
}
