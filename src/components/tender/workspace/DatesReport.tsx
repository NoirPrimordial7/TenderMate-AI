"use client";

import { SourceAction } from "@/components/tender/workspace/SourceAction";
import { ReportEmptyState } from "@/components/tender/workspace/ReportEmptyState";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import type { SourceReference, TenderAnalysis } from "@/domain/tender/types";
import { parseTenderDate } from "@/services/tenderReport";

const localeMap = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" } as const;

export function DatesReport({ analysis, onSource }: { analysis: TenderAnalysis; onSource: (source: SourceReference) => void }) {
  const t = useTranslations("workspaceV2");
  const { activeLocale } = useLocale();
  if (!analysis.dates.length) return <ReportEmptyState title={t("noDates")} description={t("notFound")}/>;
  const items = analysis.dates.map((item) => ({ item, parsed: parseTenderDate(item.isoDate, item.date) })).sort((a, b) => (a.parsed?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.parsed?.getTime() ?? Number.MAX_SAFE_INTEGER));
  const now = Date.now();
  const next = items.find(({ parsed }) => parsed && parsed.getTime() >= now);
  return <div className="tm-v2-report"><section className="tm-v2-countdown"><p className="tm-eyebrow">{t("nextImportantDate")}</p><h2>{next?.item.label || t("noUpcomingDate")}</h2><strong>{next?.parsed ? t("days", { count: Math.ceil((next.parsed.getTime() - now) / 86_400_000) }) : t("unavailable")}</strong><p>{next?.item.date || t("notFound")}</p></section><ol className="tm-v2-timeline">{items.map(({ item, parsed }) => { const expired = parsed ? parsed.getTime() < now : false; const remaining = parsed ? Math.ceil((parsed.getTime() - now) / 86_400_000) : null; return <li key={`${item.label}-${item.date}`} data-status={expired ? "expired" : parsed ? "upcoming" : "unknown"}><span/><div><small>{expired ? t("expired") : remaining === null ? t("unverified") : t("days", { count: remaining })}</small><h2>{item.label}</h2><strong>{parsed ? new Intl.DateTimeFormat(localeMap[activeLocale], { dateStyle: "medium", timeStyle: "short" }).format(parsed) : item.date}</strong>{!parsed ? <p>{t("dateUnverified")}</p> : null}</div><SourceAction source={item.source} onSelect={onSource}/></li>; })}</ol></div>;
}
