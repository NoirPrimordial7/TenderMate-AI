import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "@/app/providers";
import { isAppLocale, LOCALE_COOKIE } from "@/i18n/config";
import { BRAND } from "@/config/brand";
import { SEO_BY_LOCALE } from "@/config/seo";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const localeValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isAppLocale(localeValue) ? localeValue : "en";
  const seo = SEO_BY_LOCALE[locale];
  return {
    metadataBase: new URL(BRAND.appUrl),
    title: {
      default: seo.title,
      template: `%s | ${BRAND.name}`
    },
    description: seo.description,
    keywords: seo.keywords,
    applicationName: BRAND.name,
    authors: [{ name: BRAND.name, url: BRAND.appUrl }],
    creator: BRAND.name,
    publisher: BRAND.name,
    category: "Tender analysis and procurement intelligence",
    formatDetection: { telephone: false, email: false, address: false },
    alternates: {
      canonical: "/",
      languages: { en: "/?lang=en", hi: "/?lang=hi", mr: "/?lang=mr" }
    },
    openGraph: {
      type: "website",
      url: BRAND.appUrl,
      siteName: BRAND.name,
      title: seo.title,
      description: seo.description,
      locale: locale === "en" ? "en_IN" : locale === "hi" ? "hi_IN" : "mr_IN",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${BRAND.name} — AI tender analysis for India` }]
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/opengraph-image"]
    },
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
      shortcut: "/icon.svg"
    },
    manifest: "/manifest.webmanifest",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1
      }
    }
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const localeValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const initialLocale = isAppLocale(localeValue) ? localeValue : null;

  return (
    <html lang={initialLocale ?? "und"}>
      <body className="min-h-screen font-sans antialiased">
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
