"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AuthUser } from "@/domain/auth/types";
import { AuthDock, AuthMode } from "@/components/entry/AuthDock";
import { UploadDock } from "@/components/entry/UploadDock";

type ControlDockProps = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  initialAuthMode?: AuthMode;
  onAuthenticated?: () => void;
};

export function ControlDock({
  isAuthenticated,
  isLoading,
  user,
  initialAuthMode,
  onAuthenticated
}: ControlDockProps) {
  const shouldReduceMotion = useReducedMotion();
  const stateKey = isLoading ? "loading" : isAuthenticated && user ? "upload" : "auth";

  return (
    <motion.aside
      className={`te-control-dock ${stateKey === "upload" ? "te-control-dock-active" : ""}`}
      initial={shouldReduceMotion ? false : { opacity: 0, x: 34, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.52, delay: shouldReduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="te-dock-chrome" aria-hidden="true">
        <span>TM.OS / ENTRY</span>
        <span>SECURE CHANNEL</span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stateKey}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14, filter: "blur(5px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(4px)" }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {isLoading ? (
            <section className="te-session-loading" role="status" aria-live="polite">
              <p className="te-kicker">Secure channel</p>
              <h2>Checking your session…</h2>
              <div className="te-loading-lines" aria-hidden="true"><span /><span /><span /></div>
            </section>
          ) : isAuthenticated && user ? (
            <UploadDock user={user} />
          ) : (
            <AuthDock initialMode={initialAuthMode} onAuthenticated={onAuthenticated} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.aside>
  );
}
