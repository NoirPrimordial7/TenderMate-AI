"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, LockKeyhole, LogOut, UserRound } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ApplicationShell } from "@/components/shell/ApplicationShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import type { BillingUsage } from "@/domain/billing/types";
import { SUPPORTED_LOCALES, type AppLocale } from "@/i18n/config";
import { billingService } from "@/services/BillingService";
import { toFriendlyApiMessage } from "@/services/api";

export default function ProfilePage() {
  const { isAuthenticated, logout, updateLanguagePreferences, user } = useAuth();
  const { activeLocale, analysisLocale, setAnalysisLocale, setLocale } = useLocale();
  const t = useTranslations("profile");
  const language = useTranslations("language");
  const common = useTranslations("common");
  const { data: usage, error } = useSWR<BillingUsage>(isAuthenticated && user ? ["private", user.id, "billing-usage"] : null, billingService.getUsage);
  const credits = usage?.free_analysis_credits ?? user?.free_analysis_credits;
  const plan = usage?.plan_name ?? user?.plan_name;
  const subscription = usage?.subscription_status ?? user?.subscription_status;

  const changeInterface = (locale: AppLocale) => {
    setLocale(locale);
    void updateLanguagePreferences({ preferred_language: locale, preferred_analysis_language: analysisLocale });
  };
  const changeAnalysis = (locale: AppLocale) => {
    setAnalysisLocale(locale);
    void updateLanguagePreferences({ preferred_language: activeLocale, preferred_analysis_language: locale });
  };

  return (
    <ApplicationShell>
      <ProtectedRoute>
        <PageHeader eyebrow={t("eyebrow")} title={t("editorialTitle")} description={t("support")} accent="blue" meta={<StatusBadge tone={user?.is_active ? "lime" : "danger"}>{user?.is_active ? common("active") : common("inactive")}</StatusBadge>} />
        {error ? <p className="tm-alert tm-alert-warning">{toFriendlyApiMessage(error, t("usageFailed"))}</p> : null}
        <div className="tm-profile-layout">
          <section className="tm-profile-identity" aria-labelledby="profile-identity-title">
            <UserRound aria-hidden="true"/>
            <p className="tm-eyebrow">{t("overview")}</p>
            <h2 id="profile-identity-title">{user?.full_name || common("account")}</h2>
            <p>{user?.email}</p>
            <dl><div><dt>{t("role")}</dt><dd>{user?.role?.replace("_", " ")}</dd></div><div><dt>{t("status")}</dt><dd>{user?.is_active ? common("active") : common("inactive")}</dd></div></dl>
          </section>
          <section className="tm-profile-plan" aria-labelledby="profile-plan-title">
            <p className="tm-eyebrow">{t("currentPlan")}</p>
            <strong>{typeof credits === "number" ? Math.max(0, credits) : "—"}</strong>
            <h2 id="profile-plan-title">{t("creditsAvailable")}</h2>
            <p>{plan ?? common("unavailable")} · {subscription ?? common("unavailable")}</p>
            <Link href="/billing">{t("managePlan")}<ArrowRight aria-hidden="true"/></Link>
          </section>
          <section className="tm-language-preferences" aria-labelledby="language-preferences-title">
            <p className="tm-eyebrow">{t("languagePreferences")}</p>
            <h2 id="language-preferences-title">{t("languageTitle")}</h2>
            <p>{t("languageSupport")}</p>
            <div className="tm-language-setting"><div><strong>{language("interfaceLabel")}</strong><span>{t("interfaceLanguageSupport")}</span></div><div role="group" aria-label={language("interfaceLabel")}>{SUPPORTED_LOCALES.map((locale) => <button key={locale} type="button" aria-pressed={activeLocale === locale} onClick={() => changeInterface(locale)}>{language(`${locale}Short`)}</button>)}</div></div>
            <div className="tm-language-setting"><div><strong>{language("analysisLabel")}</strong><span>{t("analysisLanguageSupport")}</span></div><div role="group" aria-label={language("analysisLabel")}>{SUPPORTED_LOCALES.map((locale) => <button key={locale} type="button" aria-pressed={analysisLocale === locale} onClick={() => changeAnalysis(locale)}>{language(`${locale}Short`)}</button>)}</div></div>
          </section>
          <section className="tm-profile-security" aria-labelledby="profile-security-title">
            <LockKeyhole aria-hidden="true"/>
            <p className="tm-eyebrow">{t("security")}</p>
            <h2 id="profile-security-title">{t("protection")}</h2>
            <ul><li>{t("jwtProtection")}</li><li>{t("passwordProtection")}</li><li>{t("privateDocuments")}</li></ul>
            <button type="button" onClick={() => logout("/login")}><LogOut aria-hidden="true"/>{t("logout")}</button>
          </section>
        </div>
      </ProtectedRoute>
    </ApplicationShell>
  );
}
