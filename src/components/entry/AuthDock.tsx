"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { SignInForm } from "@/components/entry/SignInForm";
import { SignUpForm } from "@/components/entry/SignUpForm";

export type AuthMode = "signin" | "signup";

type AuthDockProps = {
  initialMode?: AuthMode;
  onAuthenticated?: () => void;
};

export function AuthDock({ initialMode = "signin", onAuthenticated }: AuthDockProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => setMode(initialMode), [initialMode]);

  return (
    <section aria-label="Account access">
      <div className="te-mode-switch" aria-label="Choose account action">
        <motion.span
          className="te-mode-indicator"
          aria-hidden="true"
          animate={{ x: mode === "signup" ? "100%" : "0%" }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        />
        <button type="button" onClick={() => setMode("signin")} aria-pressed={mode === "signin"}>
          Sign in
        </button>
        <button type="button" onClick={() => setMode("signup")} aria-pressed={mode === "signup"}>
          Create account
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(3px)" }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="te-auth-form-wrap"
        >
          {mode === "signin" ? (
            <SignInForm onAuthenticated={onAuthenticated} />
          ) : (
            <SignUpForm onAuthenticated={onAuthenticated} />
          )}
        </motion.div>
      </AnimatePresence>

      <p className="te-dock-footnote">
        <span aria-hidden="true">●</span> Encrypted account session · private tender workspace
      </p>
    </section>
  );
}
