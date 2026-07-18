"use client";

import { Check, Copy, KeyRound, Laptop, Loader2, LogOut, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import useSWR from "swr";
import { cacheKeys } from "@/cache/keys";
import { PRIVATE_SWR_POLICY } from "@/cache/policy";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import type { MfaSetup } from "@/domain/auth/security";
import { accountSecurityService } from "@/services/AccountSecurityService";
import { isApiError } from "@/services/api";

type SensitiveAction = "setup" | "disable" | "recovery" | null;

function translatedError(error: unknown, t: (key: string) => string) {
  if (isApiError(error)) {
    if (error.status === 401) return t("verificationFailed");
    if (error.status === 428) return t("recentLoginRequired");
    if (error.status === 429) return t("rateLimited");
    if (error.status >= 500 || error.status === 0) return t("unavailable");
  }
  return t("errorGeneric");
}

export function AccountSecurityCenter() {
  const { logout, refreshUser, user } = useAuth();
  const { activeLocale } = useLocale();
  const t = useTranslations("security");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [sensitiveAction, setSensitiveAction] = useState<SensitiveAction>(null);
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const statusKey = user ? cacheKeys.securityStatus(user.id) : null;
  const sessionsKey = user ? cacheKeys.securitySessions(user.id) : null;
  const activityKey = user ? cacheKeys.securityActivity(user.id) : null;
  const { data: securityStatus, error: statusError, mutate: mutateStatus } = useSWR(statusKey, accountSecurityService.getStatus, PRIVATE_SWR_POLICY);
  const { data: sessions, error: sessionsError, mutate: mutateSessions } = useSWR(sessionsKey, accountSecurityService.getSessions, PRIVATE_SWR_POLICY);
  const { data: activity, error: activityError, mutate: mutateActivity } = useSWR(activityKey, accountSecurityService.getActivity, PRIVATE_SWR_POLICY);

  const dateFormatter = new Intl.DateTimeFormat(activeLocale === "hi" ? "hi-IN" : activeLocale === "mr" ? "mr-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" });

  async function refreshSecurity() {
    await Promise.all([mutateStatus(), mutateSessions(), mutateActivity()]);
    await refreshUser();
  }

  async function performSensitive(action: Exclude<SensitiveAction, null>) {
    setBusy(action);
    setError("");
    try {
      if (action === "setup") setSetup(await accountSecurityService.startMfa());
      if (action === "disable") {
        await accountSecurityService.disableMfa();
        setSetup(null);
        setRecoveryCodes([]);
      }
      if (action === "recovery") setRecoveryCodes((await accountSecurityService.regenerateRecoveryCodes()).recovery_codes);
      setSensitiveAction(null);
      await refreshSecurity();
    } catch (nextError) {
      if (isApiError(nextError) && nextError.status === 428) setSensitiveAction(action);
      setError(translatedError(nextError, t));
    } finally {
      setBusy("");
    }
  }

  async function verifyRecent(event: FormEvent) {
    event.preventDefault();
    if (!sensitiveAction) return;
    setBusy("verify");
    setError("");
    try {
      await accountSecurityService.verifyRecent(verifyPassword, verifyCode || undefined);
      setVerifyPassword("");
      setVerifyCode("");
      await performSensitive(sensitiveAction);
    } catch (nextError) {
      setError(translatedError(nextError, t));
    } finally {
      setBusy("");
    }
  }

  async function confirmMfa(event: FormEvent) {
    event.preventDefault();
    setBusy("confirm");
    setError("");
    try {
      const response = await accountSecurityService.confirmMfa(setupCode);
      setRecoveryCodes(response.recovery_codes);
      setSetup(null);
      setSetupCode("");
      await refreshSecurity();
    } catch (nextError) {
      setError(translatedError(nextError, t));
    } finally {
      setBusy("");
    }
  }

  async function cancelMfaSetup() {
    setBusy("cancel-setup");
    setError("");
    try {
      await accountSecurityService.cancelMfaSetup();
      setSetup(null);
      setSetupCode("");
    } catch (nextError) {
      setError(translatedError(nextError, t));
    } finally {
      setBusy("");
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setBusy("password");
    setError("");
    try {
      await accountSecurityService.changePassword(currentPassword, newPassword, passwordCode || undefined);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordCode("");
      await refreshSecurity();
    } catch (nextError) {
      setError(translatedError(nextError, t));
    } finally {
      setBusy("");
    }
  }

  async function revokeSession(id: string, current: boolean) {
    setBusy(id);
    try {
      await accountSecurityService.revokeSession(id);
      if (current) logout("/login");
      else await mutateSessions();
    } catch (nextError) {
      setError(translatedError(nextError, t));
    } finally {
      setBusy("");
    }
  }

  async function revokeSessions(scope: "others" | "all") {
    setBusy(`sessions-${scope}`);
    setError("");
    try {
      if (scope === "others") {
        await accountSecurityService.revokeOtherSessions();
        await mutateSessions();
      } else {
        await accountSecurityService.revokeAllSessions();
        logout("/login");
      }
    } catch (nextError) {
      setError(translatedError(nextError, t));
    } finally {
      setBusy("");
    }
  }

  async function copyRecoveryCodes() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    } catch {
      setError(t("copyFailed"));
    }
  }

  const resourceError = statusError ?? sessionsError ?? activityError;

  return (
    <section className="ni-security-center" aria-labelledby="account-security-title">
      <header><div><p className="tm-eyebrow">{t("eyebrow")}</p><h2 id="account-security-title">{t("title")}</h2><p>{t("support")}</p></div><span className={securityStatus?.mfa_enabled ? "ni-security-state is-on" : "ni-security-state"}>{securityStatus?.mfa_enabled ? <ShieldCheck aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}{securityStatus?.mfa_enabled ? t("mfaOn") : t("mfaOff")}</span></header>
      {error ? <p className="tm-alert tm-alert-warning" role="alert">{error}</p> : null}
      {resourceError && !error ? <p className="tm-alert tm-alert-warning" role="alert">{translatedError(resourceError, t)}</p> : null}

      <div className="ni-security-grid">
        <article className="ni-security-feature"><Smartphone aria-hidden="true" /><div><h3>{t("mfaTitle")}</h3><p>{t("mfaSupport")}</p><small>{t("recoveryRemaining", { count: securityStatus?.recovery_codes_remaining ?? 0 })}</small></div><div className="ni-security-actions">{securityStatus?.mfa_enabled ? <><button type="button" onClick={() => void performSensitive("recovery")}>{t("newRecoveryCodes")}</button><button type="button" className="is-danger" onClick={() => void performSensitive("disable")}>{t("disableMfa")}</button></> : <button type="button" onClick={() => void performSensitive("setup")}>{t("enableMfa")}</button>}</div></article>
        <article className="ni-security-feature"><KeyRound aria-hidden="true" /><div><h3>{t("passwordTitle")}</h3><p>{t("passwordSupport")}</p></div><form onSubmit={changePassword} className="ni-security-form"><label>{t("currentPassword")}<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label>{t("newPassword")}<input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>{securityStatus?.mfa_enabled ? <label>{t("authenticatorCode")}<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={passwordCode} onChange={(event) => setPasswordCode(event.target.value)} required /></label> : null}<button type="submit" disabled={busy === "password"}>{t("changePassword")}</button></form></article>
      </div>

      {sensitiveAction ? <form className="ni-security-verify" onSubmit={verifyRecent}><h3>{t("verifyRecentTitle")}</h3><p>{t("verifyRecentSupport")}</p><label>{t("currentPassword")}<input type="password" autoComplete="current-password" value={verifyPassword} onChange={(event) => setVerifyPassword(event.target.value)} required /></label>{securityStatus?.mfa_enabled ? <label>{t("authenticatorCode")}<input inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={verifyCode} onChange={(event) => setVerifyCode(event.target.value)} required /></label> : null}<div><button type="button" onClick={() => setSensitiveAction(null)}>{t("cancel")}</button><button type="submit" disabled={busy === "verify"}>{t("verify")}</button></div></form> : null}

      {setup ? <form className="ni-mfa-setup" onSubmit={confirmMfa}><div><p className="tm-eyebrow">{t("stepOne")}</p><h3>{t("scanTitle")}</h3><p>{t("scanSupport")}</p><QRCodeSVG value={setup.otpauth_uri} size={176} level="M" marginSize={2} /><code>{setup.secret}</code></div><label>{t("stepTwo")}<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={setupCode} onChange={(event) => setSetupCode(event.target.value)} required /></label><div><button type="button" disabled={busy === "cancel-setup"} onClick={() => void cancelMfaSetup()}>{t("cancel")}</button><button type="submit" disabled={busy === "confirm" || setupCode.length !== 6}>{t("confirmMfa")}</button></div></form> : null}

      {recoveryCodes.length ? <div className="ni-recovery-codes" role="status"><div><h3>{t("saveRecoveryTitle")}</h3><p>{t("saveRecoverySupport")}</p></div><ul>{recoveryCodes.map((code) => <li key={code}><code>{code}</code></li>)}</ul><button type="button" onClick={() => void copyRecoveryCodes()}><Copy aria-hidden="true" />{t("copyCodes")}</button><button type="button" onClick={() => setRecoveryCodes([])}><Check aria-hidden="true" />{t("savedCodes")}</button></div> : null}

      <section className="ni-session-list" aria-labelledby="active-sessions-title"><header><div><p className="tm-eyebrow">{t("devicesEyebrow")}</p><h3 id="active-sessions-title">{t("sessionsTitle")}</h3></div><div><button type="button" disabled={busy === "sessions-others"} onClick={() => void revokeSessions("others")}>{t("signOutOthers")}</button><button type="button" disabled={busy === "sessions-all"} onClick={() => void revokeSessions("all")}>{t("signOutAll")}</button></div></header>{sessions?.map((session) => <article key={session.id}><Laptop aria-hidden="true" /><div><strong>{session.device}</strong><span>{session.current ? t("currentSession") : session.ip_hint ?? t("networkUnavailable")}</span><small>{t("lastActive", { date: dateFormatter.format(new Date(session.last_seen_at)) })}</small></div><button type="button" disabled={busy === session.id} onClick={() => void revokeSession(session.id, session.current)}>{session.current ? t("signOutCurrent") : t("signOutSession")}</button></article>)}</section>

      <section className="ni-security-activity" aria-labelledby="security-activity-title"><p className="tm-eyebrow">{t("activityEyebrow")}</p><h3 id="security-activity-title">{t("activityTitle")}</h3>{activity?.length ? <ol>{activity.map((event) => <li key={event.id}><span className={event.success ? "is-success" : "is-warning"} aria-hidden="true" /><div><strong>{t(`events.${event.event_type}`)}</strong><small>{event.device ?? t("unknownDevice")} · {dateFormatter.format(new Date(event.created_at))}</small></div></li>)}</ol> : <p>{t("activityEmpty")}</p>}</section>
      {busy && !["password", "verify", "confirm"].includes(busy) ? <p className="ni-security-busy" role="status"><Loader2 aria-hidden="true" />{t("working")}</p> : null}
    </section>
  );
}
