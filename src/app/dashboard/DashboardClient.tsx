"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, FileWarning, Gauge, Upload } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import EmptyState from "@/components/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import type { HistoryTender } from "@/domain/tender/types";
import { toFriendlyApiMessage } from "@/services/api";
import { daysUntil, getInvalidDocuments, getPriorityTender } from "@/services/tenderWorkspace";
import { useTenderHistory } from "@/hooks/useTenderHistory";
import { useBillingUsage } from "@/hooks/useBillingUsage";

const localeMap = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" } as const;

function getStatusTone(status: HistoryTender["status"]) {
  if (status === "Analyzed") return "lime" as const;
  if (status === "Extracted") return "violet" as const;
  if (status === "Failed") return "danger" as const;
  if (status === "Invalid") return "danger" as const;
  if (status === "Validating") return "blue" as const;
  return "blue" as const;
}

export default function DashboardClient() {
  const { isAuthenticated, user } = useAuth();
  const { activeLocale } = useLocale();
  const t = useTranslations("dashboard");
  const common = useTranslations("common");
  const historyCopy = useTranslations("history");
  const cache = useTranslations("cache");
  const { items: tenders, error: tendersError, isInitialLoading: isLoading, isRefreshing, hasCachedData, latestUpdatedAt } = useTenderHistory(isAuthenticated && user ? user.id : null, activeLocale);
  const { data: usage, isValidating: usageRefreshing } = useBillingUsage(isAuthenticated && user ? user.id : null);
  const priority = getPriorityTender(tenders);
  const invalidDocuments = getInvalidDocuments(tenders);
  const credits = usage?.free_analysis_credits ?? user?.free_analysis_credits;
  const plan = usage?.plan_name ?? user?.plan_name;
  const pipeline = tenders.reduce((counts, item) => {
    if (item.status === "Invalid" || item.documentType === "non_tender" || item.documentValidationStatus === "invalid") counts.invalid += 1;
    else if (item.status === "Failed" || item.riskLevel === "High") counts.attention += 1;
    else if (item.status === "Analyzed") counts.ready += 1;
    else if (item.status === "Extracted") counts.processing += 1;
    else if (item.status === "Validating") counts.validating += 1;
    else counts.uploaded += 1;
    return counts;
  }, { uploaded: 0, validating: 0, processing: 0, ready: 0, attention: 0, invalid: 0 });
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
      {isRefreshing || usageRefreshing ? <p className="tm-cache-status" role="status">{cache("checking")}</p> : null}
      {!isRefreshing && latestUpdatedAt ? <p className="tm-cache-status">{cache("updated", { time: new Intl.DateTimeFormat(localeMap[activeLocale], { timeStyle: "short", dateStyle: "medium" }).format(new Date(latestUpdatedAt)) })}</p> : null}
      {error && tenders.length ? <p className="tm-alert tm-alert-warning" role="status">{hasCachedData ? cache("showingSaved") : cache("refreshFailed")}</p> : null}
      {error && !tenders.length ? <EmptyState title={t("loadFailed")} description={error} actionHref="/" actionLabel={t("uploadTender")} /> : null}
      {!isLoading && !error && tenders.length === 0 ? <EmptyState title={t("empty")} description={t("emptyDescription")} actionHref="/" actionLabel={t("uploadTender")} secondaryActionHref="/pricing" secondaryActionLabel={t("viewPricing")} /> : null}

      {!isLoading && tenders.length > 0 ? (
        <div className="tm-dashboard-grid">
          <section className="tm-priority-tender" aria-labelledby="priority-tender-title">
            <div className="tm-section-kicker"><span>{t("priority")}</span><CalendarClock aria-hidden="true" /></div>
            <div className="tm-priority-body">
              <div>
                <StatusBadge tone={priority ? getStatusTone(priority.status) : "neutral"}>{priority ? historyCopy(`status${priority.status}`) : common("unavailable")}</StatusBadge>
                <h2 id="priority-tender-title">{priority?.tenderTitle || t("noPriority")}</h2>
                <p>{priority?.organization || t("noPrioritySupport")}</p>
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
              {(["uploaded", "validating", "processing", "ready", "attention", "invalid"] as const).map((key) => (
                <div key={key} className={`tm-pipeline-${key}`}><strong>{pipeline[key]}</strong><span>{t(key)}</span></div>
              ))}
            </div>
          </section>

          {invalidDocuments.length ? <section className="tm-invalid-documents" aria-labelledby="invalid-documents-title"><div className="tm-section-heading"><div><p className="tm-eyebrow">{t("invalid")}</p><h2 id="invalid-documents-title">{t("invalidDocuments")}</h2></div></div>{invalidDocuments.slice(0, 3).map((item) => <Link key={item.id} href={`/tender/${item.id}`}><FileWarning aria-hidden="true"/><span><strong>{item.tenderTitle}</strong><small>{item.documentValidationReason || t("invalidReason")}</small></span><ArrowRight aria-hidden="true"/></Link>)}</section> : null}

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
