"use client";

import { Fragment } from "react";
import { useTranslations } from "@/contexts/LocaleContext";
import type { RiskItem, RiskLevel } from "@/domain/tender/types";

const levels: RiskLevel[] = ["High", "Medium", "Low"];

export function RiskMatrix({ risks }: { risks: RiskItem[] }) {
  const t = useTranslations("workspaceV2");
  const supported = risks.filter((risk): risk is RiskItem & { likelihood: RiskLevel } => Boolean(risk.likelihood));
  if (!supported.length) return null;
  return <section className="tm-v2-risk-matrix" aria-labelledby="risk-matrix-title"><div><h2 id="risk-matrix-title">{t("riskMatrix")}</h2><p>{t("riskMatrixExplain")}</p></div><div className="tm-v2-matrix-grid"><span />{levels.slice().reverse().map((impact) => <strong key={impact}>{t(`level.${impact}`)}</strong>)}{levels.map((likelihood) => <Fragment key={likelihood}><strong>{t(`level.${likelihood}`)}</strong>{levels.slice().reverse().map((impact) => { const matches = supported.filter((risk) => risk.likelihood === likelihood && risk.level === impact); return <div key={`${likelihood}-${impact}`} data-level={impact.toLowerCase()}>{matches.map((risk) => <span key={risk.title} title={risk.title}>{risk.title}</span>)}</div>; })}</Fragment>)}</div></section>;
}
