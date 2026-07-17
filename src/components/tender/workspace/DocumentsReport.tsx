"use client";

import dynamic from "next/dynamic";
import { SourceAction } from "@/components/tender/workspace/SourceAction";
import { ReportEmptyState } from "@/components/tender/workspace/ReportEmptyState";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useTranslations } from "@/contexts/LocaleContext";
import type { SourceReference, TenderAnalysis } from "@/domain/tender/types";
import { aggregateRequirementStatuses } from "@/services/tenderReport";

const ReadinessChart = dynamic(() => import("@/components/tender/workspace/ReadinessChart").then((module) => module.ReadinessChart), { loading: () => <div className="tm-v2-chart-loading" /> });

export function DocumentsReport({ analysis, onSource }: { analysis: TenderAnalysis; onSource: (source: SourceReference) => void }) {
  const t = useTranslations("workspaceV2");
  const counts = aggregateRequirementStatuses(analysis.documents);
  if (!counts.total) return <ReportEmptyState title={t("noDocuments")} description={t("notFound")}/>;
  return <div className="tm-v2-report"><section className="tm-v2-document-head"><div><p className="tm-eyebrow">{t("checklistProgress")}</p><strong>{counts.ready}<span>/{counts.total}</span></strong><p>{t("verifiedReady")}</p></div><ReadinessChart counts={counts}/></section><div className="tm-v2-table">{analysis.documents.map((item) => <article key={`${item.name}-${item.source.page}`}><StatusBadge tone={item.status === "Ready" ? "lime" : item.status === "Missing" ? "danger" : "blue"}>{t(`requirementStatus.${item.status}`)}</StatusBadge><div><h2>{item.name}</h2><p>{item.reason || t("reasonUnavailable")}</p><dl><div><dt>{t("priority")}</dt><dd>{t(`priorityValue.${item.priority}`)}</dd></div><div><dt>{t("nextStep")}</dt><dd>{item.preparationAction || t("verifyDocument")}</dd></div></dl></div><SourceAction source={item.source} onSelect={onSource}/></article>)}</div></div>;
}
