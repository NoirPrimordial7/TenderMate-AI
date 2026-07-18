import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "@/app/providers";
import { isAppLocale, LOCALE_COOKIE } from "@/i18n/config";
import { translateMessage } from "@/i18n/messages";
import { absoluteBrandUrl, BRAND } from "@/config/brand";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const localeValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isAppLocale(localeValue) ? localeValue : "en";
  return {
    metadataBase: new URL(BRAND.appUrl),
    title: {
      default: `${BRAND.name} · ${BRAND.tagline[locale]}`,
      template: `%s · ${BRAND.name}`
    },
    description: translateMessage(locale, "launch.metaDescription"),
    applicationName: BRAND.name,
    alternates: {
      canonical: "/",
      languages: { en: "/?lang=en", hi: "/?lang=hi", mr: "/?lang=mr" }
    },
    openGraph: {
      type: "website",
      url: BRAND.appUrl,
      siteName: BRAND.name,
      title: `${BRAND.name} · ${BRAND.tagline[locale]}`,
      description: translateMessage(locale, "launch.metaDescription"),
      locale: locale === "en" ? "en_IN" : locale === "hi" ? "hi_IN" : "mr_IN"
    },
    twitter: {
      card: "summary_large_image",
      title: `${BRAND.name} · ${BRAND.tagline[locale]}`,
      description: translateMessage(locale, "launch.metaDescription")
    },
    manifest: "/manifest.webmanifest"
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const localeValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const initialLocale = isAppLocale(localeValue) ? localeValue : null;

  return (
    <html lang={initialLocale ?? "und"}>
      <body className="min-h-screen font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: BRAND.name,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: absoluteBrandUrl(),
              description: BRAND.shortDescription,
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR", availability: "https://schema.org/PreOrder" }
            }).replace(/</g, "\\u003c")
          }}
        />
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
