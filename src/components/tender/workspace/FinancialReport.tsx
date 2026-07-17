"use client";

import dynamic from "next/dynamic";
import { SourceAction } from "@/components/tender/workspace/SourceAction";
import { ReportEmptyState } from "@/components/tender/workspace/ReportEmptyState";
import { useTranslations } from "@/contexts/LocaleContext";
import type { SourceReference, TenderAnalysis } from "@/domain/tender/types";
import { getFinancialChartItems, normalizeFinancialAmount } from "@/services/tenderReport";

const FinancialCommitmentChart = dynamic(() => import("@/components/tender/workspace/FinancialCommitmentChart").then((module) => module.FinancialCommitmentChart), { loading: () => <div className="tm-v2-chart-loading" /> });
const formatInr = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export function FinancialReport({ analysis, onSource }: { analysis: TenderAnalysis; onSource: (source: SourceReference) => void }) {
  const t = useTranslations("workspaceV2");
  if (!analysis.financials.length) return <ReportEmptyState title={t("noFinancials")} description={t("notFound")}/>;
  const known = getFinancialChartItems(analysis.financials).map(({ amount }) => amount);
  const upfront = known.reduce((sum, value) => sum + value, 0);
  return <div className="tm-v2-report"><section className="tm-v2-financial-summary"><div><p>{t("estimatedValue")}</p><strong>{analysis.snapshot.estimatedValue || t("notFound")}</strong></div><div><p>{t("emd")}</p><strong>{analysis.snapshot.emdAmount || t("notFound")}</strong></div><div><p>{t("knownCommitments")}</p><strong>{known.length ? formatInr(upfront) : t("unavailable")}</strong></div></section><FinancialCommitmentChart items={analysis.financials}/><section className="tm-v2-ledger"><header><h2>{t("financialLedger")}</h2><p>{t("financialLedgerExplain")}</p></header>{analysis.financials.map((item) => { const amount = normalizeFinancialAmount(item); return <article key={`${item.label}-${item.source.page}`}><div><h3>{item.label}</h3><p>{item.note || t("explanationUnavailable")}</p></div><strong>{amount !== null ? formatInr(amount) : item.value || t("notFound")}</strong><dl><div><dt>{t("type")}</dt><dd>{item.type || t("unavailable")}</dd></div><div><dt>{t("refundable")}</dt><dd>{item.refundable === null || item.refundable === undefined ? t("unverified") : item.refundable ? t("yes") : t("no")}</dd></div></dl><SourceAction source={item.source} onSelect={onSource}/></article>; })}</section><section className="tm-v2-plain-language"><p className="tm-eyebrow">{t("plainLanguage")}</p><h2>{known.length ? t("knownUpfront", { amount: formatInr(upfront) }) : t("financialUnknown")}</h2><p>{analysis.departmentQuestions[0] || t("confirmFinancials")}</p></section></div>;
}
