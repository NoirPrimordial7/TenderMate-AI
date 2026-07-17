"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useTranslations } from "@/contexts/LocaleContext";
import type { TenderRecordView } from "@/domain/tender/types";

export function TenderWorkspaceHeader({ tender, onOpenSource }: { tender: TenderRecordView; onOpenSource: () => void }) {
  const t = useTranslations("workspaceV2");
  const [expanded, setExpanded] = useState(false);
  const analysis = tender.analysis;
  if (!analysis) return null;
  const snapshot = analysis.snapshot;
  const riskTone = analysis.decision.riskLevel === "High" ? "danger" : analysis.decision.riskLevel === "Medium" ? "orange" : "lime";
  return (
    <header className="tm-v2-header">
      <div className="tm-v2-header-copy">
        <p className="tm-eyebrow">{t("eyebrow")}</p>
        <h1 className={expanded ? "is-expanded" : ""}>{snapshot.title || tender.title}</h1>
        <button type="button" className="tm-v2-title-toggle" onClick={() => setExpanded((value) => !value)}>{expanded ? t("collapseTitle") : t("showTitle")}</button>
        <p>{snapshot.organization} <span aria-hidden="true">·</span> {snapshot.tenderId}</p>
        <div className="tm-v2-header-tags"><span>{snapshot.category}</span><span>{snapshot.location}</span><StatusBadge tone="violet">{t(`verification.${tender.documentValidationStatus ?? "pending"}`)}</StatusBadge></div>
      </div>
      <dl className="tm-v2-header-metrics">
        <div><dt>{t("deadline")}</dt><dd>{snapshot.submissionDeadline}</dd></div>
        <div><dt>{t("value")}</dt><dd>{snapshot.estimatedValue}</dd></div>
        <div><dt>{t("fit")}</dt><dd>{analysis.decision.overallFitScore}%</dd></div>
        <div><dt>{t("risk")}</dt><dd><StatusBadge tone={riskTone}>{t(`level.${analysis.decision.riskLevel}`)}</StatusBadge></dd></div>
      </dl>
      <button type="button" className="tm-v2-open-source" onClick={onOpenSource}>{t("openPdf")}<ExternalLink aria-hidden="true" /></button>
    </header>
  );
}
