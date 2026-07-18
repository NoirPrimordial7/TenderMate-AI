import type { AppLocale } from "@/i18n/config";
import { absoluteBrandUrl, BRAND } from "@/config/brand";

type LocalizedSeo = {
  title: string;
  description: string;
  keywords: string[];
};

export const SEO_BY_LOCALE: Record<AppLocale, LocalizedSeo> = {
  en: {
    title: "NividaIQ | AI Tender Analysis for India",
    description: "AI tender analysis for Indian MSMEs. Review eligibility, required documents, EMD, deadlines, risks and source-backed answers before you bid.",
    keywords: ["tender analysis", "AI tender analysis India", "tender eligibility checker", "tender document analysis", "government tender analysis", "bid decision support", "MSME tender software", "EMD checker", "procurement intelligence India", "NividaIQ"]
  },
  hi: {
    title: "NividaIQ | भारत के लिए AI निविदा विश्लेषण",
    description: "भारतीय MSME के लिए AI निविदा विश्लेषण। बोली लगाने से पहले पात्रता, जरूरी दस्तावेज़, EMD, अंतिम तिथि, जोखिम और स्रोत-आधारित उत्तर समझें।",
    keywords: ["निविदा विश्लेषण", "टेंडर विश्लेषण", "सरकारी निविदा", "टेंडर पात्रता", "निविदा दस्तावेज़", "EMD जांच", "MSME टेंडर", "बोली निर्णय सहायता", "NividaIQ"]
  },
  mr: {
    title: "NividaIQ | भारतासाठी AI निविदा विश्लेषण",
    description: "भारतीय MSME साठी AI निविदा विश्लेषण. बोलीपूर्वी पात्रता, आवश्यक कागदपत्रे, EMD, अंतिम मुदती, जोखीम आणि स्रोताधारित उत्तरे समजून घ्या.",
    keywords: ["निविदा विश्लेषण", "टेंडर विश्लेषण", "सरकारी निविदा", "निविदा पात्रता", "आवश्यक कागदपत्रे", "EMD तपासणी", "MSME निविदा", "बोली निर्णय सहाय्य", "NividaIQ"]
  }
};

export function buildPublicStructuredData(locale: AppLocale) {
  const seo = SEO_BY_LOCALE[locale];
  const sameAs = Object.values(BRAND.social).filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BRAND.appUrl}#organization`,
        name: BRAND.name,
        url: BRAND.appUrl,
        logo: { "@type": "ImageObject", url: absoluteBrandUrl("/icon.svg") },
        ...(sameAs.length ? { sameAs } : {})
      },
      {
        "@type": "WebSite",
        "@id": `${BRAND.appUrl}#website`,
        url: BRAND.appUrl,
        name: BRAND.name,
        alternateName: ["Nivida IQ", "NividaIQ Tender Intelligence"],
        description: seo.description,
        inLanguage: ["en-IN", "hi-IN", "mr-IN"],
        publisher: { "@id": `${BRAND.appUrl}#organization` }
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${BRAND.appUrl}#software`,
        name: BRAND.name,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Tender analysis and procurement decision support",
        operatingSystem: "Web",
        url: BRAND.appUrl,
        description: seo.description,
        inLanguage: ["en-IN", "hi-IN", "mr-IN"],
        publisher: { "@id": `${BRAND.appUrl}#organization` }
      }
    ]
  };
}
