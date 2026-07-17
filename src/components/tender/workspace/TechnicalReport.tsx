"use client";

import { SourceAction } from "@/components/tender/workspace/SourceAction";
import { ReportEmptyState } from "@/components/tender/workspace/ReportEmptyState";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useTranslations } from "@/contexts/LocaleContext";
import type { SourceReference, TenderAnalysis } from "@/domain/tender/types";

const categoryKeys: Record<string, string> = {
  "Scope of work": "scope",
  Specifications: "specifications",
  Experience: "experience",
  Personnel: "personnel",
  Equipment: "equipment",
  Certifications: "certifications",
  "Delivery and installation": "delivery",
  "Quality and acceptance": "quality",
  Other: "other"
};

export function TechnicalReport({ analysis, onSource }: { analysis: TenderAnalysis; onSource: (source: SourceReference) => void }) {
  const t = useTranslations("workspaceV2");
  if (!analysis.technical.length) return <ReportEmptyState title={t("noTechnical")} description={t("notFound")}/>;
  const groups = analysis.technical.reduce((result, item) => {
    const category = item.category || "Other";
    result.set(category, [...(result.get(category) ?? []), item]);
    return result;
  }, new Map<string, typeof analysis.technical>());
  return <div className="tm-v2-report tm-v2-technical-groups">{Array.from(groups.entries()).map(([category, items]) => <section key={category}><header><p className="tm-eyebrow">{categoryKeys[category] ? t(`technicalCategories.${categoryKeys[category]}`) : category}</p><strong>{items.length}</strong></header>{items.map((item) => <article key={`${item.requirement}-${item.source.page}`}><StatusBadge tone={item.userStatus === "Ready" ? "lime" : item.userStatus === "Missing" ? "danger" : "blue"}>{t(`requirementStatus.${item.userStatus || "Not Verified"}`)}</StatusBadge><div><h2>{item.requirement}</h2><p>{item.explanation || t("explanationUnavailable")}</p><dl><div><dt>{t("acceptanceCriteria")}</dt><dd>{item.acceptanceCriteria || t("notFound")}</dd></div><div><dt>{t("mandatory")}</dt><dd>{item.mandatory === null || item.mandatory === undefined ? t("unverified") : item.mandatory ? t("yes") : t("no")}</dd></div></dl></div><SourceAction source={item.source} onSelect={onSource}/></article>)}</section>)}</div>;
}
