"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "@/contexts/LocaleContext";

export function VerificationWarning({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("launch");
  return (
    <aside className={`nl-verification-warning ${compact ? "nl-verification-warning-compact" : ""}`} aria-label={t("aiDisclaimer")}>
      <ShieldCheck aria-hidden="true" />
      <p>{t("verificationWarning")}</p>
    </aside>
  );
}
