import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "@/app/providers";
import { isAppLocale, LOCALE_COOKIE } from "@/i18n/config";
import { translateMessage } from "@/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const localeValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isAppLocale(localeValue) ? localeValue : "en";
  return {
    title: translateMessage(locale, "common.brandHome"),
    description: translateMessage(locale, "hero.productLabel")
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
