"use client";

import { ArrowUpRight, Loader2 } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { PasswordField, TextField } from "@/components/entry/AuthFields";
import { DockStatus } from "@/components/entry/DockStatus";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError } from "@/services/api";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import Link from "next/link";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

function signupErrorMessage(error: unknown, t: (key: string) => string) {
  if (isApiError(error)) {
    if (error.status === 409) return t("emailExists");
    if (error.status === 422) return t("checkDetails");
    if (error.status === 0) return t("unreachable");
    if (error.status >= 500) return t("unavailable");
  }
  return t("signupFailed");
}

export function SignUpForm({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const { signup } = useAuth();
  const { activeLocale, analysisLocale } = useLocale();
  const t = useTranslations("auth");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const onTurnstileToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim() || password.length < 12 || !acceptedLegal) {
      setError(t("signupMissing"));
      return;
    }
    setIsSubmitting(true);
    try {
      await signup({ full_name: fullName.trim(), email: email.trim(), password, preferred_language: activeLocale, preferred_analysis_language: analysisLocale, accepted_legal: acceptedLegal, legal_locale: activeLocale, turnstile_token: turnstileToken });
      onAuthenticated?.();
    } catch (submitError) {
      setError(signupErrorMessage(submitError, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="te-form" noValidate>
      <div className="te-form-heading">
        <h2>{t("startTitle")}</h2>
        <p className="te-form-subtitle">{t("startSupport")}</p>
      </div>
      <TextField label={t("fullName")} type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
      <TextField label={t("workEmail")} type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <PasswordField label={t("password")} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} hint={t("passwordHint")} minLength={12} required />
      <label className="nl-legal-checkbox"><input type="checkbox" checked={acceptedLegal} onChange={(event) => setAcceptedLegal(event.target.checked)} required /><span>{t("legalAcceptPrefix")} <Link href="/legal/terms" target="_blank">{t("legalTerms")}</Link>, <Link href="/legal/privacy" target="_blank">{t("legalPrivacy")}</Link> {t("legalAnd")} <Link href="/legal/ai-disclaimer" target="_blank">{t("legalAiDisclaimer")}</Link>.</span></label>
      <TurnstileWidget action="signup" onToken={onTurnstileToken} />
      {error ? <DockStatus tone="danger" live="assertive">{error}</DockStatus> : null}
      <button type="submit" disabled={isSubmitting} className="te-primary-button">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        <span>{isSubmitting ? t("creating") : t("createMine")}</span>
        {!isSubmitting ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : null}
      </button>
    </form>
  );
}
