import { ElectricEntryWorkspace } from "@/components/entry/ElectricEntryWorkspace";
import { cookies } from "next/headers";
import { isAppLocale, LOCALE_COOKIE } from "@/i18n/config";
import { buildPublicStructuredData } from "@/config/seo";

export default async function HomePage() {
  const cookieStore = await cookies();
  const localeValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isAppLocale(localeValue) ? localeValue : "en";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildPublicStructuredData(locale)).replace(/</g, "\\u003c")
        }}
      />
      <ElectricEntryWorkspace />
    </>
  );
}
