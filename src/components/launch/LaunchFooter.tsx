"use client";

import Link from "next/link";
import { BRAND } from "@/config/brand";
import { useTranslations } from "@/contexts/LocaleContext";
import { PerformanceModeControl } from "@/components/launch/PerformanceModeControl";
import { NividaIQMark } from "@/components/brand/NividaIQMark";

const legalLinks = [
  ["terms", "terms"], ["privacy", "privacy"], ["ai-disclaimer", "aiDisclaimer"],
  ["refunds", "refunds"], ["credits", "credits"], ["acceptable-use", "acceptableUse"],
  ["cookies", "cookies"], ["data-retention", "dataRetention"],
  ["third-party-processors", "processors"], ["grievance", "grievance"]
] as const;

export function LaunchFooter() {
  const t = useTranslations("launch");
  const navigation = useTranslations("navigation");
  return (
    <footer className="nl-footer">
      <div className="te-page-container nl-footer-grid">
        <section>
          <Link href="/" className="nl-footer-brand"><NividaIQMark className="nl-footer-brand-mark" />{BRAND.name}</Link>
          <span className="nl-beta-badge">{t("publicBeta")}</span>
          <p>{t("footerDescription")}</p>
          <PerformanceModeControl compact />
        </section>
        <nav aria-label={t("legal")}>
          <h2>{t("legal")}</h2>
          <div>{legalLinks.map(([slug, key]) => <Link key={slug} href={`/legal/${slug}`}>{t(key)}</Link>)}</div>
        </nav>
        <section>
          <h2>{t("support")}</h2>
          <Link href="/demo">{t("demo")}</Link>
          <Link href="/pricing">{navigation("pricing")}</Link>
          {BRAND.supportEmail ? <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a> : <span>{t("contactPending")}</span>}
          <p>© {new Date().getFullYear()} {BRAND.name}</p>
        </section>
      </div>
    </footer>
  );
}
