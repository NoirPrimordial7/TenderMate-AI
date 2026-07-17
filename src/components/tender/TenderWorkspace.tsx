"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, CircleAlert, FileQuestion, FileText, ShieldAlert } from "lucide-react";
import { useTranslations } from "@/contexts/LocaleContext";
import type { SourceReference, TenderRecordView } from "@/domain/tender/types";
import { StatusBadge } from "@/components/workspace/StatusBadge";

const StoredPdfViewer = dynamic(() => import("@/components/tender/StoredPdfViewer").then((module) => module.StoredPdfViewer), { loading: () => <div className="tm-source-loading" /> });

const tabs = ["overview", "eligibility", "documents", "financials", "technical", "dates", "risks", "source", "ask"] as const;
type WorkspaceTab = (typeof tabs)[number];

function sourceButton(source: SourceReference, label: string, onSelect: (source: SourceReference) => void) {
  return <button type="button" className="tm-source-button" onClick={() => onSelect(source)}>{label} · {source.page}<ArrowRight aria-hidden="true"/></button>;
}

export function TenderWorkspace({ tender }: { tender: TenderRecordView }) {
  const t = useTranslations("workspace");
  const common = useTranslations("common");
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [source, setSource] = useState<SourceReference | null>(null);
  const analysis = tender.analysis;
  if (!analysis) return null;
  const missingDocuments = analysis.documents.filter((item) => item.status === "Missing");
  const blockers = analysis.eligibility.filter((item) => item.userStatus === "Missing" || item.impact === "High");
  const selectSource = (next: SourceReference) => { setSource(next); setActiveTab("source"); };

  return (
    <div className="tm-tender-workspace">
      <header className="tm-tender-header">
        <div><p className="tm-eyebrow">{t("tenderWorkspace")}</p><h1>{analysis.snapshot.title || tender.title}</h1><p>{analysis.snapshot.organization} · {analysis.snapshot.tenderId}</p></div>
        <div className="tm-tender-header-metrics"><div><span>{t("deadline")}</span><strong>{analysis.snapshot.submissionDeadline}</strong></div><div><span>{t("value")}</span><strong>{analysis.snapshot.estimatedValue}</strong></div><div><span>{t("fit")}</span><strong>{analysis.decision.overallFitScore}%</strong></div><StatusBadge tone={analysis.decision.riskLevel === "High" ? "danger" : analysis.decision.riskLevel === "Medium" ? "orange" : "lime"}>{t(`risk${analysis.decision.riskLevel}`)}</StatusBadge></div>
      </header>
      <nav className="tm-workspace-tabs" aria-label={t("navigation")}>
        {tabs.map((tab) => <button key={tab} type="button" aria-current={activeTab === tab ? "page" : undefined} onClick={() => setActiveTab(tab)}>{t(`tabs.${tab}`)}</button>)}
      </nav>
      <AnimatePresence mode="wait">
        <motion.section key={activeTab} className="tm-workspace-panel" initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.24 }}>
          {activeTab === "overview" ? <div className="tm-overview-grid"><section className="tm-decision-block"><p className="tm-eyebrow">{t("decision")}</p><strong>{analysis.decision.shouldApply}</strong><h2>{analysis.decision.recommendation}</h2><div className="tm-fit-meter"><span style={{ width: `${analysis.decision.overallFitScore}%` }} /><i>{analysis.decision.overallFitScore}%</i></div></section><section className="tm-readiness-strip"><div><span>{t("criticalBlockers")}</span><strong>{blockers.length}</strong></div><div><span>{t("missingDocuments")}</span><strong>{missingDocuments.length}</strong></div><div><span>{t("emd")}</span><strong>{analysis.snapshot.emdAmount}</strong></div><div><span>{t("timeLeft")}</span><strong>{analysis.snapshot.submissionDeadline}</strong></div></section><section className="tm-next-actions"><p className="tm-eyebrow">{t("nextActions")}</p><ol>{analysis.beforeApply.map((item) => <li key={item.label}><span>{item.status === "ready" ? <Check aria-hidden="true"/> : <CircleAlert aria-hidden="true"/>}</span>{item.label}</li>)}</ol></section><section className="tm-missing-info"><p className="tm-eyebrow">{t("notFound")}</p>{analysis.missingInformation.length ? <ul>{analysis.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{t("nothingMissing")}</p>}</section></div> : null}
          {activeTab === "eligibility" ? <div className="tm-requirement-list">{analysis.eligibility.length ? analysis.eligibility.map((item) => <article key={`${item.title}-${item.source.page}`}><StatusBadge tone={item.userStatus === "Ready" ? "lime" : item.userStatus === "Missing" ? "danger" : "neutral"}>{item.userStatus}</StatusBadge><div><h2>{item.title}</h2><p>{item.text}</p><small>{t("impact")}: {item.impact}</small></div>{sourceButton(item.source, t("viewSource"), selectSource)}</article>) : <div className="tm-workspace-empty"><FileQuestion aria-hidden="true"/><h2>{t("noEligibility")}</h2><p>{t("notFoundInTender")}</p></div>}</div> : null}
          {activeTab === "documents" ? <div><div className="tm-checklist-progress"><span><strong>{analysis.documents.length - missingDocuments.length}</strong> / {analysis.documents.length}</span><p>{t("documentsReady")}</p></div><div className="tm-requirement-list">{analysis.documents.map((item) => <article key={`${item.name}-${item.source.page}`}><StatusBadge tone={item.status === "Ready" ? "lime" : item.status === "Missing" ? "danger" : "neutral"}>{item.status}</StatusBadge><div><h2>{item.name}</h2><p>{item.priority}</p></div>{sourceButton(item.source, t("viewSource"), selectSource)}</article>)}</div></div> : null}
          {activeTab === "financials" ? <div className="tm-financial-ledger"><div className="tm-financial-lead"><span>{t("estimatedValue")}</span><strong>{analysis.snapshot.estimatedValue}</strong><small>{t("emd")}: {analysis.snapshot.emdAmount}</small></div>{analysis.financials.map((item) => <article key={`${item.label}-${item.source.page}`}><div><span>{item.label}</span><strong>{item.value || t("notFoundInTender")}</strong>{item.note ? <small>{item.note}</small> : null}</div>{sourceButton(item.source, t("source"), selectSource)}</article>)}</div> : null}
          {activeTab === "technical" ? <div className="tm-requirement-list">{analysis.technical.length ? analysis.technical.map((item) => <article key={`${item.requirement}-${item.source.page}`}><FileText aria-hidden="true"/><div><h2>{item.requirement}</h2></div>{sourceButton(item.source, t("viewSource"), selectSource)}</article>) : <div className="tm-workspace-empty"><FileQuestion aria-hidden="true"/><h2>{t("noTechnical")}</h2><p>{t("notFoundInTender")}</p></div>}</div> : null}
          {activeTab === "dates" ? <ol className="tm-date-timeline">{analysis.dates.map((item) => <li key={`${item.label}-${item.date}`}><span /><div><small>{item.status ? t(`dateStatus.${item.status}`) : common("unavailable")}</small><h2>{item.label}</h2><strong>{item.date}</strong></div></li>)}</ol> : null}
          {activeTab === "risks" ? <div className="tm-risk-register">{analysis.risks.length ? analysis.risks.map((item) => <article key={`${item.title}-${item.source.page}`}><StatusBadge tone={item.level === "High" ? "danger" : item.level === "Medium" ? "orange" : "neutral"}>{item.level}</StatusBadge><div><h2>{item.title}</h2><p>{item.explanation}</p><small>{t("recommendedAction")}: {t("reviewAndResolve")}</small></div>{sourceButton(item.source, t("viewSource"), selectSource)}</article>) : <div className="tm-workspace-empty"><ShieldAlert aria-hidden="true"/><h2>{t("noRisks")}</h2><p>{t("notFoundInTender")}</p></div>}</div> : null}
          {activeTab === "source" ? <StoredPdfViewer tenderId={tender.id} source={source} pageCount={tender.pageCount} /> : null}
          {activeTab === "ask" ? <div className="tm-ask-foundation"><span>AI</span><p className="tm-eyebrow">{t("askEyebrow")}</p><h2>{t("askTitle")}</h2><p>{t("askSupport")}</p><div><FileText aria-hidden="true"/>{t("askScope")}</div><button type="button" disabled>{t("comingNext")}</button></div> : null}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
