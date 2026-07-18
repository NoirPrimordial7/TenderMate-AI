import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { LegalPage } from "@/components/launch/LegalPage";
import { BRAND } from "@/config/brand";
import { LEGAL_CONFIG } from "@/config/legal";
import { LEGAL_DOCUMENTS, LEGAL_SLUGS, isLegalSlug } from "@/content/legal";
import { isAppLocale, LOCALE_COOKIE } from "@/i18n/config";

export function generateStaticParams() {
  return LEGAL_SLUGS.map((document) => ({ document }));
}

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }): Promise<Metadata> {
  const { document } = await params;
  if (!isLegalSlug(document)) return {};
  const cookieStore = await cookies();
  const localeValue = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isAppLocale(localeValue) ? localeValue : "en";
  const content = LEGAL_DOCUMENTS[document];
  return {
    title: content.title[locale],
    description: content.summary[locale],
    alternates: { canonical: `/legal/${document}` },
    openGraph: { title: `${content.title[locale]} · ${BRAND.name}`, description: content.summary[locale] }
  };
}

export default async function LegalDocumentPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!isLegalSlug(document)) notFound();
  return <LegalPage slug={document} legalConfig={{ entityName: LEGAL_CONFIG.entityName, contactEmail: LEGAL_CONFIG.contactEmail, grievanceOfficerName: LEGAL_CONFIG.grievanceOfficerName, grievanceOfficerEmail: LEGAL_CONFIG.grievanceOfficerEmail, effectiveDate: LEGAL_CONFIG.effectiveDate, version: LEGAL_CONFIG.version }} />;
}
