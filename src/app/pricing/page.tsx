"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { ApplicationShell } from "@/components/shell/ApplicationShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/contexts/LocaleContext";
import { billingService } from "@/services/BillingService";
import { toFriendlyApiMessage } from "@/services/api";

export default function PricingPage() {
  const { isAuthenticated, user } = useAuth();
  const t = useTranslations("pricing");
  const common = useTranslations("common");
  const { data, error, isLoading } = useSWR(["public", "billing-plans"], billingService.getPlans);
  const plans = data?.plans ?? [];
  const currentPlan = user?.plan_name ?? "free";

  return (
    <ApplicationShell protectedPage={false} className="tm-pricing-shell">
      <PageHeader eyebrow={t("eyebrow")} title={t("editorialTitle")} description={t("support")} accent="orange" meta={<div className="tm-payment-state"><Sparkles aria-hidden="true"/><span>{t("paymentState")}</span></div>} />
      {isLoading ? <div className="tm-pricing-loading" role="status">{common("loading")}</div> : null}
      {error ? <p className="tm-alert tm-alert-warning">{toFriendlyApiMessage(error, t("loadFailed"))}</p> : null}
      {plans.length > 0 ? (
        <section className="tm-pricing-stage" aria-label={t("planComparison")}>
          <div className="tm-pricing-lead">
            <p>{t("leadLabel")}</p>
            <strong>{t("leadNumber")}</strong>
            <span>{t("leadCopy")}</span>
          </div>
          <div className="tm-plan-list">
            {plans.map((plan, index) => {
              const isCurrent = plan.id === currentPlan;
              const recommended = plan.id === "pro";
              return (
                <article key={plan.id} className={`tm-plan-row ${recommended ? "tm-plan-featured" : ""}`}>
                  <span className="tm-plan-index">0{index + 1}</span>
                  <div className="tm-plan-name"><h2>{plan.name}</h2>{isCurrent ? <StatusBadge tone="lime">{t("current")}</StatusBadge> : recommended ? <StatusBadge tone="violet">{t("recommended")}</StatusBadge> : null}</div>
                  <div className="tm-plan-price"><strong>{plan.price_label}</strong><span>{plan.interval ? t("perMonth") : t("noCharge")}</span></div>
                  <dl className="tm-plan-allowance"><div><dt>{t("analyses")}</dt><dd>{plan.analyses_included}</dd></div><div><dt>{t("dailyUploads")}</dt><dd>{plan.uploads_per_day ?? common("unavailable")}</dd></div></dl>
                  <ul>{(["privateWorkspace", "structuredAnalysis", plan.id === "business" ? "teamReady" : "sourceReferences"] as const).map((feature) => <li key={feature}><Check aria-hidden="true"/>{t(feature)}</li>)}</ul>
                  {isCurrent ? <span className="tm-plan-action-disabled">{t("current")}</span> : plan.coming_soon ? <span className="tm-plan-action-disabled">{t("comingSoon")}</span> : isAuthenticated ? <Link href="/billing">{t("managePlan")}<ArrowRight aria-hidden="true"/></Link> : <Link href="/signup">{t("signup")}<ArrowRight aria-hidden="true"/></Link>}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      <footer className="tm-pricing-note"><strong>{t("truthTitle")}</strong><p>{t("truthCopy")}</p></footer>
    </ApplicationShell>
  );
}
