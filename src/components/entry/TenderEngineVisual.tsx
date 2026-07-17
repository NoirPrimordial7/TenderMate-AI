"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { PointerEvent } from "react";

const statuses = [
  "READING DOCUMENT",
  "DETECTING REQUIREMENTS",
  "CHECKING ELIGIBILITY",
  "SOURCE VERIFIED"
];

export function TenderEngineVisual({ isActive }: { isActive: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 90, damping: 22, mass: 0.6 });
  const smoothY = useSpring(pointerY, { stiffness: 90, damping: 22, mass: 0.6 });
  const translateX = useTransform(smoothX, [-0.5, 0.5], [-6, 6]);
  const translateY = useTransform(smoothY, [-0.5, 0.5], [-5, 5]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-1.4, 1.4]);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [1.2, -1.2]);

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
      className={`te-engine-scene ${isActive ? "te-engine-scene-active" : ""}`}
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 28, scale: 0.94, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.82, delay: shouldReduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="te-engine-spotlight" />
      <div className="te-engine-orbit te-engine-orbit-one" />
      <div className="te-engine-orbit te-engine-orbit-two" />

      <motion.div
        className="te-engine-object"
        style={shouldReduceMotion ? undefined : {
          x: translateX,
          y: translateY,
          rotateX,
          rotateY,
          transformPerspective: 1000
        }}
      >
        <div className="te-engine-paper te-engine-paper-back">
          <span>FORM / NIT / 2026</span>
        </div>
        <div className="te-engine-paper te-engine-paper-mid">
          <span className="te-paper-index">02 / TECHNICAL</span>
        </div>
        <div className="te-engine-paper te-engine-paper-front">
          <header className="te-paper-head">
            <span className="te-paper-emblem">TM</span>
            <div><strong>NOTICE INVITING TENDER</strong><small>PROCUREMENT INTELLIGENCE INPUT</small></div>
            <span className="te-paper-code">NIT:26-0717</span>
          </header>
          <div className="te-paper-grid" />
          <div className="te-ocr-box te-ocr-one"><span>03.2</span><i>TURNOVER REQUIREMENT</i><b>ELIGIBILITY</b></div>
          <div className="te-ocr-box te-ocr-two"><span>06.1</span><i>EMD / BID SECURITY</i><b>DOCUMENT</b></div>
          <div className="te-ocr-box te-ocr-three"><span>08.4</span><i>SUBMISSION DEADLINE</i><b>RISK</b></div>
          <span className="te-registration te-registration-tl">+</span>
          <span className="te-registration te-registration-br">+</span>
          <div className="te-scan-beam" />
        </div>
      </motion.div>

      <div className="te-engine-label te-engine-label-left">
        <span>ENGINE</span><strong>DOC-INTEL / V1</strong>
      </div>
      <div className="te-engine-label te-engine-label-right">
        <span>SOURCE</span><strong>PDF / PRIVATE</strong>
      </div>

      <div className="te-engine-status">
        <span className="te-live-pixel" />
        <span className="te-status-window">
          {statuses.map((status, index) => (
            <span key={status} className="te-engine-status-item" style={{ animationDelay: `${index * 2.4}s` }}>
              {status}
            </span>
          ))}
        </span>
        <span className="te-status-code">04/04</span>
      </div>
    </motion.div>
  );
}
