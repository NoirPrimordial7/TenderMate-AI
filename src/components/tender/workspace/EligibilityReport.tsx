"use client";

import { SourceAction } from "@/components/tender/workspace/SourceAction";
import { ReportEmptyState } from "@/components/tender/workspace/ReportEmptyState";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useTranslations } from "@/contexts/LocaleContext";
import type { SourceReference, TenderAnalysis } from "@/domain/tender/types";
import { VerificationWarning } from "@/components/launch/VerificationWarning";

export function EligibilityReport({ analysis, onSource }: { analysis: TenderAnalysis; onSource: (source: SourceReference) => void }) {
  const t = useTranslations("workspaceV2");
  if (!analysis.eligibility.length) return <ReportEmptyState title={t("noEligibility")} description={t("notFound")}/>;
  const counts = analysis.eligibility.reduce((value, item) => ({ ...value, [item.userStatus]: value[item.userStatus] + 1 }), { Ready: 0, Missing: 0, "Not Verified": 0 });
  const strongest = analysis.eligibility.find((item) => item.userStatus === "Missing" || item.impact === "High") ?? analysis.eligibility[0];
  return <div className="tm-v2-report"><VerificationWarning compact /><section className="tm-v2-report-summary"><div><p>{t("ready")}</p><strong>{counts.Ready}</strong></div><div><p>{t("notVerified")}</p><strong>{counts["Not Verified"]}</strong></div><div><p>{t("missing")}</p><strong>{counts.Missing}</strong></div><div><p>{t("readinessScore")}</p><strong>{analysis.readiness?.eligibilityScore ?? t("unavailable")}</strong></div></section><section className="tm-v2-business-meaning"><p className="tm-eyebrow">{t("businessMeaning")}</p><h2>{strongest.title}</h2><p>{strongest.verificationReason || strongest.text}</p></section><div className="tm-v2-table" role="table" aria-label={t("eligibilityRequirements")}>{analysis.eligibility.map((item) => <article role="row" key={`${item.title}-${item.source.page}`}><StatusBadge tone={item.userStatus === "Ready" ? "lime" : item.userStatus === "Missing" ? "danger" : "blue"}>{t(`requirementStatus.${item.userStatus}`)}</StatusBadge><div><h2>{item.title}</h2><p>{item.text}</p><dl><div><dt>{t("mandatory")}</dt><dd>{item.mandatory === null || item.mandatory === undefined ? t("unverified") : item.mandatory ? t("yes") : t("no")}</dd></div><div><dt>{t("impact")}</dt><dd>{t(`level.${item.impact}`)}</dd></div><div><dt>{t("confidence")}</dt><dd>{typeof item.confidence === "number" ? `${Math.round(item.confidence * 100)}%` : t("unavailable")}</dd></div></dl></div><SourceAction source={item.source} onSelect={onSource}/></article>)}</div></div>;
}
