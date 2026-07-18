"use client";

import Link from "next/link";
import { ArrowRight, Check, FileText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { VerificationWarning } from "@/components/launch/VerificationWarning";
import { useTranslations } from "@/contexts/LocaleContext";

export function PublicDemo() {
  const t = useTranslations("launch");
  const [sourceOpen, setSourceOpen] = useState(false);
  const sourceDialogRef = useRef<HTMLElement>(null);
  const sourceTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!sourceOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSourceOpen(false);
      if (event.key === "Tab" && sourceDialogRef.current) {
        const controls = Array.from(sourceDialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    sourceDialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      sourceTriggerRef.current?.focus();
    };
  }, [sourceOpen]);
  const demoRows = [
    [t("demoRowEligibility"), t("demoRowEligibilityCopy"), t("demoReview")],
    [t("demoRowFinancial"), t("demoRowFinancialCopy"), t("demoConfirm")],
    [t("demoRowDocuments"), t("demoRowDocumentsCopy"), t("demoRequired")],
    [t("demoRowDeadline"), t("demoRowDeadlineCopy"), t("demoDays")],
    [t("demoRowTechnical"), t("demoRowTechnicalCopy"), t("demoMandatory")]
  ];
  return (
    <div className="tm-app-shell nl-demo-shell">
      <Header />
      <main className="tm-app-main">
        <div className="te-page-container">
          <header className="nl-demo-header"><div><p className="tm-eyebrow">{t("demoLabel")}</p><h1>{t("demoTitle")}</h1><p>{t("demoSummary")}</p></div><Link href="/signup" className="tm-button tm-button-dark">{t("demoCreate")}<ArrowRight aria-hidden="true" /></Link></header>
          <VerificationWarning />
          <section className="nl-demo-decision">
            <div><span>{t("demoReview")}</span><h2>{t("demoDecision")}</h2><p>{t("demoFitSummary")}</p></div>
            <dl><div><dt>{t("demoFit")}</dt><dd>74/100</dd></div><div><dt>{t("demoRisk")}</dt><dd>{t("demoMedium")}</dd></div><div><dt>{t("demoReadiness")}</dt><dd>{t("demoNotVerified")}</dd></div></dl>
          </section>
          <div className="nl-demo-grid">
            <section><header><p className="tm-eyebrow">{t("demoEvidence")}</p><h2>{t("demoOverview")}</h2></header>{demoRows.map(([label, detail, state], index) => <article key={label}><div><span>{label}</span><h3>{detail}</h3></div><strong>{state}</strong><button ref={index === 0 ? sourceTriggerRef : undefined} type="button" onClick={(event) => { sourceTriggerRef.current = event.currentTarget; setSourceOpen(true); }}>{t("demoSource")}</button></article>)}</section>
            <aside><FileText aria-hidden="true" /><p className="tm-eyebrow">{t("demoBidderFit")}</p><h2>{t("demoActionTitle")}</h2><ol><li><Check aria-hidden="true" />{t("demoActionOne")}</li><li><Check aria-hidden="true" />{t("demoActionTwo")}</li><li><Check aria-hidden="true" />{t("demoActionThree")}</li></ol><h3>{t("demoQuestions")}</h3><ul><li>Which documents are mandatory?</li><li>टर्नओवर की शर्त कहाँ लिखी है?</li><li>EMD ची अंतिम तारीख कोणती आहे?</li></ul></aside>
          </div>
          <section className="nl-demo-cost"><p className="tm-eyebrow">{t("demoCostLabel")}</p><h2>{t("demoCostTitle")}</h2><p>{t("demoCostCopy")}</p></section>
        </div>
      </main>
      {sourceOpen ? <div className="nl-demo-source-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSourceOpen(false); }}><aside ref={sourceDialogRef} role="dialog" aria-modal="true" aria-labelledby="demo-source-title"><header><div><p>Page 4 · Clause 6.1</p><h2 id="demo-source-title">{t("demoSourceTitle")}</h2></div><button type="button" onClick={() => setSourceOpen(false)} aria-label={t("demoSourceClose")}><X aria-hidden="true" /></button></header><div className="nl-demo-paper"><span>NOTICE INVITING TENDER</span><h3>Supply and Installation of Desktop Computers</h3><p>6.1 The bidder shall upload GST registration, PAN, OEM authorization and evidence of three completed similar supply orders.</p></div><blockquote>“The bidder shall upload GST registration, PAN, OEM authorization…”</blockquote></aside></div> : null}
    </div>
  );
}
