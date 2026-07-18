"use client";

import Link from "next/link";
import { ArrowRight, CircleDollarSign, ReceiptText } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ApplicationShell } from "@/components/shell/ApplicationShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/contexts/LocaleContext";
import { toFriendlyApiMessage } from "@/services/api";
import { useBillingUsage } from "@/hooks/useBillingUsage";

export default function BillingPage() {
  const { isAuthenticated, user } = useAuth();
  const t = useTranslations("billing");
  const common = useTranslations("common");
  const { data: usage, error, isLoading, isValidating } = useBillingUsage(isAuthenticated && user ? user.id : null);
  const plan = usage?.plan_name ?? user?.plan_name;
  const subscription = usage?.subscription_status ?? user?.subscription_status;
  const credits = usage?.free_analysis_credits ?? user?.free_analysis_credits;

  return (
    <ApplicationShell>
      <ProtectedRoute>
        <PageHeader eyebrow={t("eyebrow")} title={t("editorialTitle")} description={t("support")} accent="lime" meta={<StatusBadge tone={subscription?.toLowerCase() === "active" ? "lime" : "neutral"}>{subscription ?? common("unavailable")}</StatusBadge>} />
        {isLoading || (isValidating && !usage) ? <div className="tm-billing-loading" role="status">{t("refreshing")}</div> : null}
        {error ? <p className="tm-alert tm-alert-warning">{toFriendlyApiMessage(error, t("loadFailed"))}</p> : null}
        <div className="tm-billing-layout">
          <section className="tm-credit-balance" aria-labelledby="credit-balance-title">
            <p className="tm-eyebrow">{t("availableAnalysis")}</p>
            <strong>{typeof credits === "number" ? Math.max(0, credits) : "—"}</strong>
            <h2 id="credit-balance-title">{t("creditsReady")}</h2>
            <p>{t("creditTruth")}</p>
            <Link className="tm-button tm-button-dark" href="/">{t("useCredit")}<ArrowRight aria-hidden="true"/></Link>
          </section>
          <section className="tm-billing-ledger" aria-labelledby="usage-ledger-title">
            <div className="tm-section-kicker"><span>{t("usageSummary")}</span><ReceiptText aria-hidden="true"/></div>
            <h2 id="usage-ledger-title">{t("usageLedger")}</h2>
            <dl>
              <div><dt>{t("analysesCompleted")}</dt><dd>{usage?.usage_counts.analysis_completed ?? common("unavailable")}</dd></div>
              <div><dt>{t("uploadsToday")}</dt><dd>{usage ? `${usage.usage_counts.pdf_upload_today ?? 0}/${usage.upload_limit_per_day}` : common("unavailable")}</dd></div>
              <div><dt>{t("totalEvents")}</dt><dd>{usage?.usage_counts.total_events ?? common("unavailable")}</dd></div>
              <div><dt>{common("plan")}</dt><dd>{plan ?? common("unavailable")}</dd></div>
            </dl>
          </section>
          <aside className="tm-payments-panel">
            <CircleDollarSign aria-hidden="true"/>
            <p className="tm-eyebrow">{t("payments")}</p>
            <h2>{t("paymentsSoon")}</h2>
            <p>{t("trialActive")}</p>
            <Link href="/pricing">{t("viewPlans")}<ArrowRight aria-hidden="true"/></Link>
          </aside>
        </div>
        <section className="tm-billing-history"><p className="tm-eyebrow">{t("billingHistory")}</p><h2>{t("noInvoices")}</h2><p>{t("noInvoicesSupport")}</p></section>
      </ProtectedRoute>
    </ApplicationShell>
  );
}
