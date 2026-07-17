"use client";

import { RiskMatrix } from "@/components/tender/workspace/RiskMatrix";
import { SourceAction } from "@/components/tender/workspace/SourceAction";
import { ReportEmptyState } from "@/components/tender/workspace/ReportEmptyState";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useTranslations } from "@/contexts/LocaleContext";
import type { RiskLevel, SourceReference, TenderAnalysis } from "@/domain/tender/types";

export function RisksReport({ analysis, onSource }: { analysis: TenderAnalysis; onSource: (source: SourceReference) => void }) {
  const t = useTranslations("workspaceV2");
  if (!analysis.risks.length) return <ReportEmptyState title={t("noRisks")} description={t("noneReported")}/>;
  const counts: Record<RiskLevel, number> = { High: 0, Medium: 0, Low: 0 };
  analysis.risks.forEach((risk) => { counts[risk.level] += 1; });
  const highest = analysis.risks.find((risk) => risk.level === "High") ?? analysis.risks.find((risk) => risk.level === "Medium") ?? analysis.risks[0];
  return <div className="tm-v2-report"><section className="tm-v2-risk-summary"><div><p>{t("high")}</p><strong>{counts.High}</strong></div><div><p>{t("medium")}</p><strong>{counts.Medium}</strong></div><div><p>{t("low")}</p><strong>{counts.Low}</strong></div><div><p>{t("highestRisk")}</p><strong>{highest.title}</strong></div></section><RiskMatrix risks={analysis.risks}/><section className="tm-v2-risk-register"><header><h2>{t("riskRegister")}</h2><p>{t("riskRegisterExplain")}</p></header>{analysis.risks.map((risk) => <article key={`${risk.title}-${risk.source.page}`}><StatusBadge tone={risk.level === "High" ? "danger" : risk.level === "Medium" ? "orange" : "neutral"}>{t(`level.${risk.level}`)}</StatusBadge><div><h3>{risk.title}</h3><p>{risk.explanation}</p><dl><div><dt>{t("likelihood")}</dt><dd>{risk.likelihood ? t(`level.${risk.likelihood}`) : t("unavailable")}</dd></div><div><dt>{t("consequence")}</dt><dd>{risk.consequence || t("notReported")}</dd></div><div><dt>{t("mitigation")}</dt><dd>{risk.mitigation || t("reviewSources")}</dd></div></dl></div><SourceAction source={risk.source} onSelect={onSource}/></article>)}</section><section className="tm-v2-business-meaning"><p className="tm-eyebrow">{t("whyMatters")}</p><h2>{highest.consequence || highest.explanation}</h2><p>{highest.mitigation || t("reviewSources")}</p></section></div>;
}
