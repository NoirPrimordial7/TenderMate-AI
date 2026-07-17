"use client";

import { motion, useReducedMotion } from "motion/react";

const loggedOutLines = ["KNOW", "BEFORE", "YOU BID."];
const loggedInLines = ["DROP THE PDF.", "SEE THE", "DECISION."];

export function HeroHeadline({ isActive }: { isActive: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  const headlineLines = isActive ? loggedInLines : loggedOutLines;

  return (
    <motion.section
      className={`te-hero-copy ${isActive ? "te-hero-copy-active" : ""}`}
      aria-labelledby="te-entry-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.28 }}
    >
      <motion.p
        className="te-product-label"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.32, delay: shouldReduceMotion ? 0 : 0.16 }}
      >
        Tender intelligence for Indian MSMEs
      </motion.p>

      <motion.h1
        key={isActive ? "upload-headline" : "entry-headline"}
        id="te-entry-title"
        className={`te-headline ${isActive ? "te-headline-upload" : ""}`}
        aria-label={isActive ? "Drop the PDF. See the decision." : "Know before you bid."}
      >
        {headlineLines.map((line, index) => (
          <span key={line} className={`te-headline-mask te-headline-line-${index + 1}`} aria-hidden="true">
            <motion.span
              initial={{ y: "112%", rotate: index === 1 ? 0.8 : -0.4 }}
              animate={{ y: "0%", rotate: 0 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.82,
                delay: shouldReduceMotion ? 0 : 0.18 + index * 0.085,
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </motion.h1>

      <motion.div
        className="te-support-row"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.45, delay: shouldReduceMotion ? 0 : 0.58 }}
      >
        <p>
          {isActive
            ? "Upload the tender once. TenderMate organises eligibility, documents, risks and deadlines before you commit the team."
            : "Understand eligibility, missing documents, risks and deadlines before your team spends days preparing a bid."}
        </p>
        <p className="te-support-note">Private by default <span aria-hidden="true">•</span> PDF up to 20 MB</p>
      </motion.div>
    </motion.section>
  );
}
