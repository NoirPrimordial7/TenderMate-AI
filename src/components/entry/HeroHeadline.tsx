"use client";

import { motion, useReducedMotion } from "motion/react";

const headlineLines = ["KNOW", "BEFORE", "YOU BID."];

export function HeroHeadline({ isActive }: { isActive: boolean }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      className={`te-hero-copy ${isActive ? "te-hero-copy-active" : ""}`}
      aria-labelledby="te-entry-title"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.28 }}
    >
      <motion.p
        className="te-product-label"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.32, delay: shouldReduceMotion ? 0 : 0.16 }}
      >
        <span>TM / AI</span> Tender intelligence system
      </motion.p>

      <h1 id="te-entry-title" className="te-headline" aria-label="Know before you bid.">
        {headlineLines.map((line, index) => (
          <span key={line} className="te-headline-mask" aria-hidden="true">
            <motion.span
              initial={shouldReduceMotion ? false : { y: "112%", rotate: index === 1 ? 1.5 : -0.7 }}
              animate={{ y: "0%", rotate: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.78,
                delay: shouldReduceMotion ? 0 : 0.2 + index * 0.075,
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </h1>

      <motion.div
        className="te-support-row"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.45, delay: shouldReduceMotion ? 0 : 0.56 }}
      >
        <p>
          TenderMate turns dense tender PDFs into clear eligibility, document, risk, and deadline intelligence for Indian MSMEs.
        </p>
        <dl className="te-proof-rail">
          <div><dt>Input</dt><dd>PDF · 20 MB MAX</dd></div>
          <div><dt>Mode</dt><dd>PRIVATE WORKSPACE</dd></div>
        </dl>
      </motion.div>
    </motion.section>
  );
}
