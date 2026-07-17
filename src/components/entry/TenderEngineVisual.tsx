"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useTranslations } from "@/contexts/LocaleContext";
import type { PointerEvent } from "react";

type TenderEngineVisualProps = {
  isActive: boolean;
  hasSelectedFile?: boolean;
};

export function TenderEngineVisual({ isActive, hasSelectedFile = false }: TenderEngineVisualProps) {
  const shouldReduceMotion = useReducedMotion();
  const t = useTranslations("hero");
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 86, damping: 24, mass: 0.65 });
  const smoothY = useSpring(pointerY, { stiffness: 86, damping: 24, mass: 0.65 });
  const translateX = useTransform(smoothX, [-0.5, 0.5], [-7, 7]);
  const translateY = useTransform(smoothY, [-0.5, 0.5], [-5, 5]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-1.2, 1.2]);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [1, -1]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <motion.div
      className={`te-document-scene ${isActive ? "te-document-scene-active" : ""} ${hasSelectedFile ? "te-document-scene-selected" : ""}`}
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      initial={{ opacity: 0, y: 72, rotate: -4, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.9, delay: shouldReduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="te-document-stack"
        style={{ x: translateX, y: translateY, rotateX, rotateY, transformPerspective: 1200 }}
      >
        <div className="te-tender-page te-tender-page-back">
          <div className="te-back-rule" />
          <span>अनुसूची / ANNEXURE II</span>
        </div>

        <div className="te-tender-page te-tender-page-mid">
          <div className="te-mid-heading">Technical qualification schedule</div>
          <div className="te-mid-table"><i /><i /><i /><i /></div>
          <span className="te-page-number">Page 14 of 32</span>
        </div>

        <article className="te-tender-page te-tender-page-front">
          <header className="te-paper-head">
            <div className="te-paper-seal">TM</div>
            <div className="te-paper-title">
              <span>ई-निविदा सूचना · ई-निविदा सूचना</span>
              <strong>NOTICE INVITING TENDER</strong>
              <small>Procurement of network and office infrastructure</small>
            </div>
            <div className="te-paper-reference"><span>NIT / 26</span><strong>0717</strong></div>
          </header>

          <div className="te-paper-summary">
            <div><span>{t("department")}</span><strong>Public Works Division</strong></div>
            <div><span>{t("estimatedValue")}</span><strong>₹ 18,40,000</strong></div>
            <div><span>{t("bidCloses")}</span><strong>28 Aug · 17:00</strong></div>
          </div>

          <div className="te-paper-table" role="presentation">
            <div className="te-paper-table-head"><span>{t("clause")}</span><span>{t("requirement")}</span><span>{t("finding")}</span></div>
            <div className="te-clause-row te-clause-eligibility"><span>3.2</span><p>Average annual turnover · मागील ३ वर्षे</p><b>{t("eligible")}</b></div>
            <div className="te-clause-row te-clause-document"><span>6.1</span><p>EMD / bid security instrument</p><b>{t("document")}</b></div>
            <div className="te-clause-row te-clause-source"><span>7.4</span><p>OEM authorisation and GST certificate</p><b>{t("source")} 14</b></div>
            <div className="te-clause-row te-clause-risk"><span>8.4</span><p>Submission deadline · अंतिम मुदत</p><b>2 {t("days")}</b></div>
          </div>

          <footer className="te-paper-footer">
            <span>GeM / CPPP source document</span>
            <span>Page 08 / 32</span>
          </footer>
          <div className="te-paper-scan" />
        </article>

        <motion.div
          className="te-document-callout te-callout-eligibility"
          animate={hasSelectedFile && !shouldReduceMotion ? { y: [0, -4, 0] } : undefined}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <span>{t("eligibility")}</span><strong>{t("confirmed")}</strong>
        </motion.div>
        <div className="te-document-callout te-callout-value"><span>{t("estimatedValue")}</span><strong>₹18.4 lakh</strong></div>
        <div className="te-document-callout te-callout-deadline"><span>{t("deadline")}</span><strong>28 Aug</strong></div>
      </motion.div>
    </motion.div>
  );
}
