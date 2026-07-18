"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { AuthUser } from "@/domain/auth/types";
import type { AuthMode } from "@/components/entry/AuthDock";
import { ControlDock } from "@/components/entry/ControlDock";
import { HeroHeadline } from "@/components/entry/HeroHeadline";
import { TenderEngineVisual } from "@/components/entry/TenderEngineVisual";
import { UploadDock } from "@/components/entry/UploadDock";
import { useTranslations } from "@/contexts/LocaleContext";

type HeroStageProps = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  initialAuthMode?: AuthMode;
  openAuthOnLoad?: boolean;
  onAuthenticated?: () => void;
};

export function HeroStage({
  isAuthenticated,
  isLoading,
  user,
  initialAuthMode,
  openAuthOnLoad = false,
  onAuthenticated
}: HeroStageProps) {
  const shouldReduceMotion = useReducedMotion();
  const t = useTranslations("hero");
  const launch = useTranslations("launch");
  const [isAuthOpen, setIsAuthOpen] = useState(openAuthOnLoad);
  const [hasSelectedFile, setHasSelectedFile] = useState(false);
  const isActive = isAuthenticated && Boolean(user);
  const closeAuth = useCallback(() => setIsAuthOpen(false), []);

  useEffect(() => {
    if (openAuthOnLoad) setIsAuthOpen(true);
  }, [openAuthOnLoad]);

  useEffect(() => {
    if (isActive) setIsAuthOpen(false);
  }, [isActive]);

  return (
    <main className={`te-stage ${isActive ? "te-stage-active" : ""} ${isAuthOpen ? "te-stage-auth-open" : ""}`}>
      <motion.div
        className="te-opening-wipe"
        aria-hidden="true"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.92, delay: shouldReduceMotion ? 0 : 0.08, ease: [0.76, 0, 0.24, 1] }}
      />
      <div className="te-paper-grain" aria-hidden="true" />

      <motion.div
        className="te-stage-inner te-page-container"
        animate={isAuthOpen ? { x: "-7vw", scale: 0.96 } : { x: 0, scale: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.52, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="te-hero-layout">
          <HeroHeadline isActive={isActive} />

          <div className="te-document-column">
            <div className="te-document-stage">
              <div className="te-scene-field te-scene-field-violet" aria-hidden="true" />
              <div className="te-scene-field te-scene-field-blue" aria-hidden="true" />
              <div className="te-scene-field te-scene-field-orange" aria-hidden="true" />
              <div className="te-document-slot">
                <TenderEngineVisual isActive={isActive} hasSelectedFile={hasSelectedFile} />
                <p className="sr-only">
                  {t("visualDescription")}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!isLoading && !isActive ? (
                <motion.div
                  key="entry-action"
                  className="te-entry-action"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: shouldReduceMotion ? 0 : 0.72 }}
                >
                  <button type="button" className="te-enter-button" onClick={() => setIsAuthOpen(true)}>
                    <span>{t("enter")}</span><ArrowUpRight aria-hidden="true" />
                  </button>
                  <div className="nl-entry-links"><Link href="/demo">{launch("seeDemo")}</Link><Link href="/signup">{launch("analyseFree")}</Link></div>
                  <p>{t("secureLine")}</p>
                </motion.div>
              ) : null}

              {isLoading ? (
                <motion.div key="session-loading" className="te-session-pill" role="status" aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {t("checkingSession")}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {isActive && user ? (
            <motion.div
              className="te-upload-dock-slot"
              initial={{ opacity: 0, y: 38, scaleY: 0.92 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.58, delay: shouldReduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <UploadDock user={user} onFileStateChange={setHasSelectedFile} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <ControlDock
        isOpen={isAuthOpen && !isActive}
        isLoading={isLoading}
        initialAuthMode={initialAuthMode}
        onClose={closeAuth}
        onAuthenticated={onAuthenticated}
      />
    </main>
  );
}
