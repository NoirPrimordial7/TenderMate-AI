"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowRight, CalendarClock, FileWarning, Gauge, Upload } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import EmptyState from "@/components/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import type { BillingUsage } from "@/domain/billing/types";
import type { HistoryTender } from "@/domain/tender/types";
import { billingService } from "@/services/BillingService";
import { tenderService } from "@/services/TenderService";
import { toFriendlyApiMessage } from "@/services/api";
import { daysUntil, getPriorityTender } from "@/services/tenderWorkspace";

const localeMap = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" } as const;

function getStatusTone(status: HistoryTender["status"]) {
  if (status === "Analyzed") return "lime" as const;
  if (status === "Extracted") return "violet" as const;
  if (status === "Failed") return "danger" as const;
  return "blue" as const;
}

export default function DashboardClient() {
  const { isAuthenticated, user } = useAuth();
  const { activeLocale } = useLocale();
  const t = useTranslations("dashboard");
  const common = useTranslations("common");
  const historyCopy = useTranslations("history");
  const { data: tenders = [], error: tendersError, isLoading } = useSWR<HistoryTender[]>(
    isAuthenticated && user ? ["private", user.id, "tender-history"] : null,
    () => tenderService.getBackendTenderHistory(),
    { revalidateOnFocus: true }
  );
  const { data: usage } = useSWR<BillingUsage>(
    isAuthenticated && user ? ["private", user.id, "billing-usage"] : null,
    billingService.getUsage
  );
  const priority = getPriorityTender(tenders);
  const credits = usage?.free_analysis_credits ?? user?.free_analysis_credits;
  const plan = usage?.plan_name ?? user?.plan_name;
  const pipeline = {
    uploaded: tenders.filter((item) => item.status === "Uploaded").length,
    processing: tenders.filter((item) => item.status === "Extracted").length,
    ready: tenders.filter((item) => item.status === "Analyzed").length,
    attention: tenders.filter((item) => item.status === "Failed" || item.riskLevel === "High").length
  };
  const error = tendersError ? toFriendlyApiMessage(tendersError, t("loadFailedDescription")) : "";
  const today = new Intl.DateTimeFormat(localeMap[activeLocale], { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <ProtectedRoute>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("greeting", { name: user?.full_name?.split(" ")[0] || common("account") })}
        description={t("today", { date: today })}
        accent="violet"
        meta={
          <dl className="tm-header-metrics">
            <div><dt>{common("plan")}</dt><dd>{plan ?? common("unavailable")}</dd></div>
            <div><dt>{common("credits")}</dt><dd>{typeof credits === "number" ? Math.max(0, credits) : common("unavailable")}</dd></div>
          </dl>
        }
        action={<Link href="/" className="tm-button tm-button-dark"><Upload aria-hidden="true" />{t("uploadTender")}</Link>}
      />

      {isLoading ? <div className="tm-dashboard-skeleton" role="status" aria-live="polite"><span />{t("loading")}</div> : null}
      {error ? <EmptyState title={t("loadFailed")} description={error} actionHref="/" actionLabel={t("uploadTender")} /> : null}
      {!isLoading && !error && tenders.length === 0 ? <EmptyState title={t("empty")} description={t("emptyDescription")} actionHref="/" actionLabel={t("uploadTender")} secondaryActionHref="/pricing" secondaryActionLabel={t("viewPricing")} /> : null}

      {!isLoading && !error && tenders.length > 0 ? (
        <div className="tm-dashboard-grid">
          <section className="tm-priority-tender" aria-labelledby="priority-tender-title">
            <div className="tm-section-kicker"><span>{t("priority")}</span><CalendarClock aria-hidden="true" /></div>
            <div className="tm-priority-body">
              <div>
                <StatusBadge tone={priority ? getStatusTone(priority.status) : "neutral"}>{priority ? historyCopy(`status${priority.status}`) : common("unavailable")}</StatusBadge>
                <h2 id="priority-tender-title">{priority?.tenderTitle}</h2>
                <p>{priority?.organization}</p>
              </div>
              <div className="tm-deadline-block">
                <span>{t("deadline")}</span>
                <strong>{priority?.deadline}</strong>
                <small>{priority && daysUntil(priority.deadlineRaw ?? priority.deadline) !== null ? t("daysRemaining", { count: daysUntil(priority.deadlineRaw ?? priority.deadline) ?? 0 }) : t("reviewDeadline")}</small>
              </div>
            </div>
            <div className="tm-priority-strip">
              <div><span>{t("recommendation")}</span><strong>{priority?.recommendation || t("processingRecommendation")}</strong></div>
              <div><span>{t("fitScore")}</span><strong>{priority?.status === "Analyzed" ? `${priority.fitScore}%` : common("pending")}</strong></div>
              <div><span>{t("risk")}</span><strong>{priority ? historyCopy(`risk${priority.riskLevel}`) : common("unavailable")}</strong></div>
              <div><span>{t("missingDocuments")}</span><strong>{priority?.missingDocuments ?? common("pending")}</strong></div>
            </div>
            {priority ? <Link className="tm-inline-action" href={`/tender/${priority.id}`}>{t("openWorkspace")}<ArrowRight aria-hidden="true" /></Link> : null}
          </section>

          <section className="tm-pipeline" aria-labelledby="pipeline-title">
            <div className="tm-section-kicker"><span>{t("pipeline")}</span><Gauge aria-hidden="true" /></div>
            <h2 id="pipeline-title">{t("pipelineTitle")}</h2>
            <div className="tm-pipeline-track">
              {(["uploaded", "processing", "ready", "attention"] as const).map((key) => (
                <div key={key} className={`tm-pipeline-${key}`}><strong>{pipeline[key]}</strong><span>{t(key)}</span></div>
              ))}
            </div>
          </section>

          <section className="tm-recent-tenders" aria-labelledby="recent-tenders-title">
            <div className="tm-section-heading"><div><p className="tm-eyebrow">{t("recent")}</p><h2 id="recent-tenders-title">{t("recentTitle")}</h2></div><Link href="/history">{t("viewAll")}<ArrowRight aria-hidden="true" /></Link></div>
            <div className="tm-recent-list">
              {tenders.slice(0, 5).map((item) => (
                <Link key={item.id} href={`/tender/${item.id}`} className="tm-recent-row">
                  <span className={`tm-status-line tm-line-${getStatusTone(item.status)}`} />
                  <span className="tm-recent-title"><strong>{item.tenderTitle}</strong><small>{item.organization}</small></span>
                  <span>{item.deadline}</span>
                  <StatusBadge tone={getStatusTone(item.status)}>{historyCopy(`status${item.status}`)}</StatusBadge>
                  <span className="tm-recent-score">{item.status === "Analyzed" ? `${item.fitScore}%` : "—"}</span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          <aside className="tm-usage-panel">
            <FileWarning aria-hidden="true" />
            <p className="tm-eyebrow">{t("usage")}</p>
            <strong>{typeof credits === "number" ? Math.max(0, credits) : "—"}</strong>
            <h2>{t("analysesRemaining")}</h2>
            <dl><div><dt>{t("uploadsToday")}</dt><dd>{usage ? `${usage.usage_counts.pdf_upload_today ?? 0}/${usage.upload_limit_per_day}` : common("unavailable")}</dd></div><div><dt>{common("plan")}</dt><dd>{plan ?? common("unavailable")}</dd></div></dl>
            <Link href="/billing">{t("manageUsage")}<ArrowRight aria-hidden="true" /></Link>
          </aside>
        </div>
      ) : null}
    </ProtectedRoute>
  );
}
