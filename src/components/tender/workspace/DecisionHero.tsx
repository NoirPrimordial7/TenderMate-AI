"use client";

import { Clock3, ShieldAlert } from "lucide-react";
import { useTranslations } from "@/contexts/LocaleContext";
import type { TenderAnalysis } from "@/domain/tender/types";
import { daysUntil } from "@/services/tenderWorkspace";
import { VerificationWarning } from "@/components/launch/VerificationWarning";

export function DecisionHero({ analysis }: { analysis: TenderAnalysis }) {
  const t = useTranslations("workspaceV2");
  const remaining = daysUntil(analysis.dates.find((item) => item.isoDate)?.isoDate ?? analysis.snapshot.submissionDeadline);
  const decision = analysis.decision.shouldApply.toLowerCase();
  return <><section className={`tm-v2-decision tm-v2-decision-${decision}`}><div><p className="tm-eyebrow">{t("decision")}</p><strong>{analysis.decision.shouldApply}</strong><p>{analysis.decision.explanation || analysis.decision.recommendation}</p></div><dl><div><dt>{t("overallFit")}</dt><dd>{analysis.decision.overallFitScore}%</dd></div><div><dt><ShieldAlert aria-hidden="true" />{t("risk")}</dt><dd>{t(`level.${analysis.decision.riskLevel}`)}</dd></div><div><dt><Clock3 aria-hidden="true" />{t("deadlineUrgency")}</dt><dd>{remaining === null ? t("unverified") : remaining < 0 ? t("expired") : t("days", { count: remaining })}</dd></div></dl></section><VerificationWarning compact /></>;
}
