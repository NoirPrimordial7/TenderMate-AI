"use client";

import dynamic from "next/dynamic";
import { DecisionHero } from "@/components/tender/workspace/DecisionHero";
import { useTranslations } from "@/contexts/LocaleContext";
import type { TenderAnalysis } from "@/domain/tender/types";
import { hasReadinessChartData } from "@/services/tenderReport";

const ScoreBreakdownChart = dynamic(() => import("@/components/tender/workspace/ScoreBreakdownChart").then((module) => module.ScoreBreakdownChart), { loading: () => <div className="tm-v2-chart-loading" /> });

function TextList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section className="tm-v2-text-list"><h2>{title}</h2>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{empty}</p>}</section>;
}

export function OverviewReport({ analysis }: { analysis: TenderAnalysis }) {
  const t = useTranslations("workspaceV2");
  const readiness = analysis.readiness ?? {};
  return <div className="tm-v2-overview"><DecisionHero analysis={analysis}/><div className="tm-v2-reason-grid"><TextList title={t("positiveFactors")} items={analysis.decision.positiveFactors ?? []} empty={t("notReported")}/><TextList title={t("criticalBlockers")} items={analysis.decision.blockers ?? []} empty={t("noneReported")}/><TextList title={t("uncertainties")} items={analysis.decision.uncertainties ?? analysis.missingInformation} empty={t("noneReported")}/></div>{hasReadinessChartData(readiness) ? <ScoreBreakdownChart scores={readiness}/> : null}<section className="tm-v2-actions"><div><p className="tm-eyebrow">{t("immediateActions")}</p><h2>{analysis.analysisSummary?.nextBestAction || t("reviewSources")}</h2></div><ol>{analysis.beforeApply.map((item, index) => <li key={`${item.label}-${index}`} data-status={item.status}><span>{String(index + 1).padStart(2, "0")}</span><p>{item.label}</p><small>{t(`actionStatus.${item.status}`)}</small></li>)}</ol></section><div className="tm-v2-summary-grid"><section><h2>{t("moneyTime")}</h2><dl><div><dt>{t("estimatedValue")}</dt><dd>{analysis.snapshot.estimatedValue || t("notFound")}</dd></div><div><dt>{t("emd")}</dt><dd>{analysis.snapshot.emdAmount || t("notFound")}</dd></div><div><dt>{t("deadline")}</dt><dd>{analysis.snapshot.submissionDeadline || t("notFound")}</dd></div></dl></section><section><h2>{t("verificationSummary")}</h2><p>{analysis.analysisSummary?.executiveSummary || analysis.decision.recommendation}</p><small>{t("schemaLabel", { version: analysis.schemaVersion || "1.0" })}</small></section></div></div>;
}
