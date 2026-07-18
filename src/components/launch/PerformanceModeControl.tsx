"use client";

import { Gauge } from "lucide-react";
import { usePerformanceMode, type PerformancePreference } from "@/contexts/PerformanceModeContext";
import { useTranslations } from "@/contexts/LocaleContext";

export function PerformanceModeControl({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("launch");
  const { preference, setPreference } = usePerformanceMode();
  return (
    <label className={`nl-performance-control ${compact ? "nl-performance-control-compact" : ""}`}>
      <span><Gauge aria-hidden="true" />{t("performance")}</span>
      <select value={preference} onChange={(event) => setPreference(event.target.value as PerformancePreference)}>
        <option value="automatic">{t("automatic")}</option>
        <option value="full">{t("full")}</option>
        <option value="low">{t("lowResource")}</option>
      </select>
    </label>
  );
}
