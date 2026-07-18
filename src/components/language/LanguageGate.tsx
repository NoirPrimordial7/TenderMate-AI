"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LOCALE_OPTIONS, type AppLocale } from "@/i18n/config";
import { translateMessage } from "@/i18n/messages";
import { BRAND } from "@/config/brand";

type LanguageGateProps = {
  onComplete: (locale: AppLocale) => void;
};

const paletteClass: Record<AppLocale, string> = {
  en: "te-language-option-en",
  hi: "te-language-option-hi",
  mr: "te-language-option-mr"
};

export function LanguageGate({ onComplete }: LanguageGateProps) {
  const shouldReduceMotion = useReducedMotion();
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | null>(null);
  const [selectedLocale, setSelectedLocale] = useState<AppLocale | null>(null);

  useEffect(() => {
    firstOptionRef.current?.focus({ preventScroll: true });
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const selectLocale = (locale: AppLocale) => {
    if (selectedLocale) return;
    setSelectedLocale(locale);
    timerRef.current = window.setTimeout(
      () => onComplete(locale),
      shouldReduceMotion ? 90 : 760
    );
  };

  return (
    <main className={`te-language-gate ${selectedLocale ? "te-language-gate-selected" : ""}`}>
      <div className="te-language-grain" aria-hidden="true" />
      <motion.div
        className={`te-language-wipe ${selectedLocale ? paletteClass[selectedLocale] : ""}`}
        aria-hidden="true"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: selectedLocale ? 1 : 0 }}
        transition={{ duration: shouldReduceMotion ? 0.08 : 0.62, ease: [0.76, 0, 0.24, 1] }}
      />

      <section className="te-language-gate-inner" aria-labelledby="tm-language-title">
        <header className="te-language-gate-head">
          <a href="#tm-language-options" className="te-language-brand" aria-label={BRAND.name}>
            <span>{BRAND.name}</span>
          </a>
          <p>{translateMessage("en", "language.gateEyebrow")}</p>
        </header>

        <div className="te-language-copy">
          <p>{translateMessage("en", "language.gateInstruction")}</p>
          <h1 id="tm-language-title">
            <span>{translateMessage("en", "language.gateLine1")}</span>
            <span>{translateMessage("en", "language.gateLine2")}</span>
            <span>{translateMessage("en", "language.gateLine3")}</span>
          </h1>
        </div>

        <div id="tm-language-options" className="te-language-options" role="group" aria-label={translateMessage("en", "language.selectLabel")}>
          {LOCALE_OPTIONS.map((option, index) => {
            const selected = selectedLocale === option.value;
            const hidden = Boolean(selectedLocale && !selected);
            return (
              <motion.button
                ref={index === 0 ? firstOptionRef : undefined}
                key={option.value}
                type="button"
                className={`te-language-option ${paletteClass[option.value]} ${selected ? "te-language-option-selected" : ""}`}
                onClick={() => selectLocale(option.value)}
                disabled={Boolean(selectedLocale)}
                aria-label={translateMessage("en", `language.${option.ariaKey}`)}
                animate={hidden ? { x: index === 0 ? "-110%" : "110%", opacity: 0 } : selected ? { scale: 1.04 } : { x: 0, opacity: 1, scale: 1 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.46, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="te-language-index">0{index + 1}</span>
                <span className="te-language-native">{translateMessage("en", `language.${option.nativeKey}`)}</span>
                <span className="te-language-english">{translateMessage("en", `language.${option.englishKey}`)}</span>
                <ArrowUpRight aria-hidden="true" />
              </motion.button>
            );
          })}
        </div>

        <p className="te-language-live" role="status" aria-live="polite">
          {selectedLocale
            ? translateMessage("en", "language.activating", {
                language: translateMessage("en", `language.${LOCALE_OPTIONS.find((item) => item.value === selectedLocale)?.englishKey ?? "englishEnglish"}`)
              })
            : ""}
        </p>
      </section>
    </main>
  );
}
