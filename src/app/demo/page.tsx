import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PublicDemo } from "@/components/launch/PublicDemo";
import { BRAND } from "@/config/brand";
import { isAppLocale, LOCALE_COOKIE } from "@/i18n/config";
import en from "../../../messages/en.json";
import hi from "../../../messages/hi.json";
import mr from "../../../messages/mr.json";

const demoMessages = { en, hi, mr } as const;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const localeValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isAppLocale(localeValue) ? localeValue : "en";
  const launch = demoMessages[locale].launch;
  return {
    title: launch.demoTitle,
    description: launch.demoSummary,
    alternates: { canonical: "/demo" },
    openGraph: { title: `${launch.demoTitle} · ${BRAND.name}`, description: launch.demoSummary }
  };
}

export default function DemoPage() {
  return <PublicDemo />;
}
