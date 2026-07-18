"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type PerformancePreference = "automatic" | "full" | "low";
type EffectiveMode = "full" | "low";

const STORAGE_KEY = "nividaiq_performance_mode";

type PerformanceContextValue = {
  preference: PerformancePreference;
  effectiveMode: EffectiveMode;
  setPreference: (mode: PerformancePreference) => void;
};

const PerformanceModeContext = createContext<PerformanceContextValue | undefined>(undefined);

type NavigatorSignals = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
};

export function detectAutomaticPerformanceMode(nav: NavigatorSignals, reducedMotion: boolean): EffectiveMode {
  const slowConnection = nav.connection?.saveData || ["slow-2g", "2g"].includes(nav.connection?.effectiveType ?? "");
  const constrainedMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;
  const constrainedCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 2;
  return reducedMotion || Boolean(slowConnection || constrainedMemory || constrainedCpu) ? "low" : "full";
}

export function PerformanceModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<PerformancePreference>("automatic");
  const [automaticMode, setAutomaticMode] = useState<EffectiveMode>("full");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "automatic" || stored === "full" || stored === "low") setPreferenceState(stored);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAutomaticMode(detectAutomaticPerformanceMode(navigator as NavigatorSignals, media.matches));
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const setPreference = (mode: PerformancePreference) => {
    setPreferenceState(mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  };
  const effectiveMode = preference === "automatic" ? automaticMode : preference;

  useEffect(() => {
    document.documentElement.dataset.performanceMode = effectiveMode;
  }, [effectiveMode]);

  const value = useMemo(() => ({ preference, effectiveMode, setPreference }), [effectiveMode, preference]);
  return <PerformanceModeContext.Provider value={value}>{children}</PerformanceModeContext.Provider>;
}

export function usePerformanceMode() {
  const value = useContext(PerformanceModeContext);
  if (!value) throw new Error("usePerformanceMode must be used inside PerformanceModeProvider.");
  return value;
}
