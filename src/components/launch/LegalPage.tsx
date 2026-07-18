"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { BRAND } from "@/config/brand";
import { LEGAL_DOCUMENTS, LEGAL_SLUGS, type LegalSlug } from "@/content/legal";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import { LanguageSwitcher } from "@/components/language/LanguageSwitcher";

type PublicLegalConfig = { entityName: string; contactEmail: string; grievanceOfficerName: string; grievanceOfficerEmail: string; effectiveDate: string; version: string };

export function LegalPage({ slug, legalConfig }: { slug: LegalSlug; legalConfig: PublicLegalConfig }) {
  const { activeLocale } = useLocale();
  const t = useTranslations("launch");
  const document = LEGAL_DOCUMENTS[slug];

  return (
    <main className="nl-legal-page">
      <div className="te-page-container">
        <header className="nl-legal-header">
          <div>
            <Link href="/" className="nl-legal-brand">{BRAND.name}</Link>
            <span className="nl-beta-badge">{t("publicBeta")}</span>
          </div>
          <LanguageSwitcher />
        </header>
        <section className="nl-legal-hero">
          <p className="tm-eyebrow">{t("lawyerReview")}</p>
          <h1>{document.title[activeLocale]}</h1>
          <p>{document.summary[activeLocale]}</p>
          <div><span>{t("version", { version: legalConfig.version })}</span><span>{t("effective", { date: legalConfig.effectiveDate })}</span><span>{t("updated", { date: legalConfig.effectiveDate })}</span></div>
          <button type="button" onClick={() => window.print()}><Printer aria-hidden="true" />{t("print")}</button>
        </section>
        <div className="nl-legal-layout">
          <nav aria-label={t("contents")}><h2>{t("contents")}</h2>{document.sections.map((section, index) => <a key={index} href={`#section-${index + 1}`}>{section.title[activeLocale]}</a>)}</nav>
          <article>{document.sections.map((section, index) => <section key={index} id={`section-${index + 1}`}><h2>{section.title[activeLocale]}</h2><p>{section.body[activeLocale]}</p></section>)}</article>
        </div>
        <aside className="nl-legal-contact">
          <h2>{t("support")}</h2>
          <p>{legalConfig.entityName}</p>
          <p>{legalConfig.contactEmail || BRAND.supportEmail || t("contactPending")}</p>
          <p>{legalConfig.grievanceOfficerName}</p>
          <p>{legalConfig.grievanceOfficerEmail || BRAND.grievanceEmail || t("contactPending")}</p>
        </aside>
        <nav className="nl-related-legal" aria-label={t("related")}><h2>{t("related")}</h2><div>{LEGAL_SLUGS.filter((item) => item !== slug).map((item) => <Link key={item} href={`/legal/${item}`}>{LEGAL_DOCUMENTS[item].title[activeLocale]}</Link>)}</div></nav>
      </div>
    </main>
  );
}
