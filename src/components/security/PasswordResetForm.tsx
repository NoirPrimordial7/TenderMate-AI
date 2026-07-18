"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PasswordField } from "@/components/entry/AuthFields";
import { useTranslations } from "@/contexts/LocaleContext";
import { accountSecurityService } from "@/services/AccountSecurityService";

export function PasswordResetForm() {
  const searchParams = useSearchParams();
  const t = useTranslations("security");
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "success" | "error">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token || password.length < 12 || password !== confirm) {
      setStatus("error");
      return;
    }
    setStatus("busy");
    try {
      await accountSecurityService.confirmPasswordReset(token, password);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="ni-reset-page"><section><p className="tm-eyebrow">{t("eyebrow")}</p><h1>{t("chooseNewPassword")}</h1><p>{t("chooseNewPasswordSupport")}</p>{status === "success" ? <div className="tm-alert tm-alert-success" role="status">{t("resetComplete")} <Link href="/login">{t("returnToLogin")}</Link></div> : <form onSubmit={submit}><PasswordField label={t("newPassword")} autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /><PasswordField label={t("confirmPassword")} autoComplete="new-password" minLength={12} value={confirm} onChange={(event) => setConfirm(event.target.value)} required />{status === "error" ? <p className="tm-alert tm-alert-warning" role="alert">{t("resetInvalid")}</p> : null}<button className="tm-button tm-button-dark" type="submit" disabled={status === "busy" || !token}>{t("updatePassword")}</button></form>}</section></main>
  );
}
