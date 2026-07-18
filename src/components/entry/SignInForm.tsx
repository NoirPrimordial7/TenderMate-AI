"use client";

import { ArrowLeft, ArrowUpRight, KeyRound, Loader2 } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { PasswordField, TextField } from "@/components/entry/AuthFields";
import { DockStatus } from "@/components/entry/DockStatus";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { useAuth } from "@/contexts/AuthContext";
import { accountSecurityService } from "@/services/AccountSecurityService";
import { isApiError } from "@/services/api";
import { useTranslations } from "@/contexts/LocaleContext";

function loginErrorMessage(error: unknown, t: (key: string) => string) {
  if (isApiError(error)) {
    if (error.status === 401) return t("invalidCredentials");
    if (error.status === 403) return t("inactive");
    if (error.status === 423) return t("locked");
    if (error.status === 429) return t("rateLimited");
    if (error.status === 0) return t("unreachable");
    if (error.status >= 500) return t("unavailable");
    return error.message;
  }
  return t("loginFailed");
}

export function SignInForm({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const { completeMfa, login } = useAuth();
  const t = useTranslations("auth");
  const security = useTranslations("security");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const onTurnstileToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError(t("loginMissing"));
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await login({ email: email.trim(), password, turnstile_token: turnstileToken });
      if (result.mfaRequired) {
        setChallengeToken(result.challengeToken ?? null);
        setPassword("");
        return;
      }
      onAuthenticated?.();
    } catch (submitError) {
      setError(loginErrorMessage(submitError, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfa = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challengeToken || !verificationCode.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      await completeMfa({
        challenge_token: challengeToken,
        ...(useRecoveryCode ? { recovery_code: verificationCode.trim() } : { code: verificationCode.trim() })
      });
      onAuthenticated?.();
    } catch (submitError) {
      setError(loginErrorMessage(submitError, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      await accountSecurityService.requestPasswordReset(email.trim(), turnstileToken);
      setResetSent(true);
    } catch (submitError) {
      setError(loginErrorMessage(submitError, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (challengeToken) {
    return (
      <form onSubmit={handleMfa} className="te-form" noValidate>
        <button type="button" className="ni-auth-back" onClick={() => { setChallengeToken(null); setVerificationCode(""); setError(""); }}><ArrowLeft aria-hidden="true" />{security("backToLogin")}</button>
        <div className="te-form-heading"><KeyRound aria-hidden="true" /><h2>{security("mfaChallengeTitle")}</h2><p className="te-form-subtitle">{security("mfaChallengeSupport")}</p></div>
        <TextField label={useRecoveryCode ? security("recoveryCode") : security("authenticatorCode")} type="text" inputMode={useRecoveryCode ? "text" : "numeric"} autoComplete="one-time-code" value={verificationCode} maxLength={useRecoveryCode ? 32 : 6} onChange={(event) => setVerificationCode(event.target.value)} required />
        <button type="button" className="ni-text-action" onClick={() => { setUseRecoveryCode((value) => !value); setVerificationCode(""); }}>{useRecoveryCode ? security("useAuthenticator") : security("useRecoveryCode")}</button>
        {error ? <DockStatus tone="danger" live="assertive">{error}</DockStatus> : null}
        <button type="submit" disabled={isSubmitting || !verificationCode.trim()} className="te-primary-button">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}<span>{security("verifyAndContinue")}</span><ArrowUpRight aria-hidden="true" /></button>
      </form>
    );
  }

  if (showReset) {
    return (
      <form onSubmit={handleReset} className="te-form" noValidate>
        <button type="button" className="ni-auth-back" onClick={() => { setShowReset(false); setResetSent(false); setError(""); }}><ArrowLeft aria-hidden="true" />{security("backToLogin")}</button>
        <div className="te-form-heading"><h2>{security("resetTitle")}</h2><p className="te-form-subtitle">{security("resetSupport")}</p></div>
        <TextField label={t("workEmail")} type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <TurnstileWidget action="password-reset" onToken={onTurnstileToken} />
        {resetSent ? <DockStatus tone="success" live="polite">{security("resetAccepted")}</DockStatus> : null}
        {error ? <DockStatus tone="danger" live="assertive">{error}</DockStatus> : null}
        <button type="submit" disabled={isSubmitting || !email.trim()} className="te-primary-button"><span>{security("sendReset")}</span><ArrowUpRight aria-hidden="true" /></button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="te-form" noValidate>
      <div className="te-form-heading"><h2>{t("welcome")}</h2><p className="te-form-subtitle">{t("signInSupport")}</p></div>
      <TextField label={t("workEmail")} type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <PasswordField label={t("password")} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <button type="button" className="ni-text-action" onClick={() => setShowReset(true)}>{security("forgotPassword")}</button>
      <TurnstileWidget action="login" onToken={onTurnstileToken} />
      {error ? <DockStatus tone="danger" live="assertive">{error}</DockStatus> : null}
      <button type="submit" disabled={isSubmitting} className="te-primary-button">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}<span>{isSubmitting ? t("signingIn") : t("signIn")}</span>{!isSubmitting ? <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> : null}</button>
    </form>
  );
}
