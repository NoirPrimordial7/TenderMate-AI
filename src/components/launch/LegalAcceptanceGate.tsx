"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import { apiRequest } from "@/services/api";

type AcceptanceStatus = { required: boolean; version: string };

export function LegalAcceptanceGate() {
  const pathname = usePathname();
  const { activeLocale } = useLocale();
  const { isAuthenticated, user, logout } = useAuth();
  const t = useTranslations("launch");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const key = isAuthenticated && user && !pathname.startsWith("/legal/") ? ["private", user.id, "legal-acceptance"] : null;
  const { data, mutate } = useSWR<AcceptanceStatus>(key, () => apiRequest("/legal/acceptance"), { revalidateOnFocus: false });

  if (!data?.required) return null;

  const submit = async () => {
    if (!accepted || saving) return;
    setSaving(true);
    setError("");
    try {
      const next = await apiRequest<AcceptanceStatus>("/legal/acceptance", { method: "POST", body: { locale: activeLocale, accepted: true } });
      await mutate(next, { revalidate: false });
    } catch {
      setError(t("acceptanceError"));
    } finally {
      setSaving(false);
    }
  };

  return <div className="nl-acceptance-overlay"><section role="dialog" aria-modal="true" aria-labelledby="nl-acceptance-title"><p className="tm-eyebrow">{t("publicBeta")}</p><h2 id="nl-acceptance-title">{t("acceptanceTitle")}</h2><p>{t("acceptanceCopy", { version: data.version })}</p><label className="nl-legal-checkbox"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>{t("acceptanceCheckbox")} <Link href="/legal/terms" target="_blank">{t("terms")}</Link>, <Link href="/legal/privacy" target="_blank">{t("privacy")}</Link> {t("acceptanceAnd")} <Link href="/legal/ai-disclaimer" target="_blank">{t("aiDisclaimer")}</Link>.</span></label>{error ? <p role="alert" className="nl-feedback-error">{error}</p> : null}<div><button type="button" className="tm-button tm-button-dark" onClick={() => void submit()} disabled={!accepted || saving}>{t("acceptanceContinue")}</button><button type="button" onClick={() => logout("/login")}>{t("acceptanceSignOut")}</button></div></section></div>;
}
