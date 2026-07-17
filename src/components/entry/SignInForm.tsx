"use client";

import { ArrowUpRight, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PasswordField, TextField } from "@/components/entry/AuthFields";
import { DockStatus } from "@/components/entry/DockStatus";
import { useAuth } from "@/contexts/AuthContext";
import { isApiError } from "@/services/api";
import { useTranslations } from "@/contexts/LocaleContext";

function loginErrorMessage(error: unknown, t: (key: string) => string) {
  if (isApiError(error)) {
    if (error.status === 401) return t("invalidCredentials");
    if (error.status === 403) return t("inactive");
    if (error.status === 423) return t("locked");
    if (error.status === 0) return t("unreachable");
    if (error.status >= 500) return t("unavailable");
  }
  return t("loginFailed");
}

export function SignInForm({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const { login } = useAuth();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError(t("loginMissing"));
      return;
    }
    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      onAuthenticated?.();
    } catch (submitError) {
      setError(loginErrorMessage(submitError, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="te-form" noValidate>
      <div className="te-form-heading">
        <h2>{t("welcome")}</h2>
        <p className="te-form-subtitle">{t("signInSupport")}</p>
      </div>
      <TextField label={t("workEmail")} type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <PasswordField label={t("password")} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      {error ? <DockStatus tone="danger" live="assertive">{error}</DockStatus> : null}
      <button type="submit" disabled={isSubmitting} className="te-primary-button">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        <span>{isSubmitting ? t("signingIn") : t("signIn")}</span>
        {!isSubmitting ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : null}
      </button>
    </form>
  );
}
