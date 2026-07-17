"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { AuthDock, type AuthMode } from "@/components/entry/AuthDock";

type ControlDockProps = {
  isOpen: boolean;
  isLoading: boolean;
  initialAuthMode?: AuthMode;
  onClose: () => void;
  onAuthenticated?: () => void;
};

export function ControlDock({ isOpen, isLoading, initialAuthMode, onClose, onAuthenticated }: ControlDockProps) {
  const shouldReduceMotion = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [sceneMode, setSceneMode] = useState<AuthMode>(initialAuthMode ?? "signin");

  useEffect(() => setSceneMode(initialAuthMode ?? "signin"), [initialAuthMode]);

  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      sheetRef.current?.querySelector<HTMLElement>('input, button, a[href]')?.focus();
    }, shouldReduceMotion ? 0 : 220);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [isOpen, onClose, shouldReduceMotion]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="te-auth-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.34 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={sheetRef}
            className={`te-auth-sheet te-auth-sheet-${sceneMode}`}
            role="dialog"
            aria-modal="true"
            aria-label="TenderMate account access"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.52, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="te-auth-colour-field" aria-hidden="true"><span>Make the bid<br />with clarity.</span></div>
            <div className="te-auth-sheet-content">
              <div className="te-auth-content-container">
                <header className="te-auth-sheet-head">
                  <button type="button" onClick={onClose} className="te-sheet-back"><ArrowLeft aria-hidden="true" /> Back to the tender</button>
                  <button type="button" onClick={onClose} className="te-sheet-close" aria-label="Close account panel"><X aria-hidden="true" /></button>
                </header>

                <div className="te-auth-content-body">
                  {isLoading ? (
                    <section className="te-sheet-loading" role="status" aria-live="polite">
                      <span />
                      <h2>Checking your session…</h2>
                    </section>
                  ) : (
                    <AuthDock initialMode={initialAuthMode} onAuthenticated={onAuthenticated} onModeChange={setSceneMode} />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
