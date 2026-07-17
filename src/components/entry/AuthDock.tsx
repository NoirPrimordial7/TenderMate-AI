"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { SignInForm } from "@/components/entry/SignInForm";
import { SignUpForm } from "@/components/entry/SignUpForm";
import { useTranslations } from "@/contexts/LocaleContext";

export type AuthMode = "signin" | "signup";

type AuthDockProps = { initialMode?: AuthMode; onAuthenticated?: () => void; onModeChange?: (mode: AuthMode) => void };

export function AuthDock({ initialMode = "signin", onAuthenticated, onModeChange }: AuthDockProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const shouldReduceMotion = useReducedMotion();
  const t = useTranslations("auth");

  useEffect(() => setMode(initialMode), [initialMode]);

  return (
    <section className={`te-auth-dock te-auth-dock-${mode}`} aria-label={t("accountAccess")}>
      <div className="te-auth-intro">
        <p>{t("oneAccount")}</p>
        <span>{t("accountSupport")}</span>
      </div>
      <div className="te-mode-switch" aria-label={t("chooseAction")}>
        <motion.span className="te-mode-indicator" aria-hidden="true" animate={{ x: mode === "signup" ? "100%" : "0%" }} transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }} />
        <button type="button" onClick={() => { setMode("signin"); onModeChange?.("signin"); }} aria-pressed={mode === "signin"}>{t("signIn")}</button>
        <button type="button" onClick={() => { setMode("signup"); onModeChange?.("signup"); }} aria-pressed={mode === "signup"}>{t("createAccount")}</button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode} initial={{ opacity: 0, x: mode === "signup" ? 28 : -28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: mode === "signup" ? -18 : 18 }} transition={{ duration: shouldReduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }} className="te-auth-form-wrap">
          {mode === "signin" ? <SignInForm onAuthenticated={onAuthenticated} /> : <SignUpForm onAuthenticated={onAuthenticated} />}
        </motion.div>
      </AnimatePresence>
      <p className="te-dock-footnote">{t("privateFootnote")}</p>
    </section>
  );
}
