"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowRight, Library, Search, SlidersHorizontal, Upload } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/shell/PageHeader";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/contexts/LocaleContext";
import type { HistoryTender } from "@/domain/tender/types";
import { tenderService } from "@/services/TenderService";
import { toFriendlyApiMessage } from "@/services/api";

type StatusFilter = "all" | HistoryTender["status"];
type RiskFilter = "all" | HistoryTender["riskLevel"];
type DeadlineFilter = "all" | "overdue" | "sevenDays" | "thirtyDays";
type SortOption = "updated" | "deadline" | "fit";

function statusTone(status: HistoryTender["status"]) {
  if (status === "Analyzed") return "lime" as const;
  if (status === "Extracted") return "violet" as const;
  if (status === "Failed") return "danger" as const;
  return "blue" as const;
}

export default function HistoryClient() {
  const { isAuthenticated, user } = useAuth();
  const t = useTranslations("history");
  const dashboard = useTranslations("dashboard");
  const common = useTranslations("common");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [deadline, setDeadline] = useState<DeadlineFilter>("all");
  const [sort, setSort] = useState<SortOption>("updated");
  const { data: history = [], error: loadError, isLoading } = useSWR<HistoryTender[]>(
    isAuthenticated && user ? ["private", user.id, "tender-history"] : null,
    () => tenderService.getBackendTenderHistory(),
    { revalidateOnFocus: true }
  );
  const error = loadError ? toFriendlyApiMessage(loadError, t("loadFailedDescription")) : "";
  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return history
      .filter((item) => !normalized || [item.tenderTitle, item.organization, item.category].some((value) => value.toLowerCase().includes(normalized)))
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => risk === "all" || item.riskLevel === risk)
      .filter((item) => {
        if (deadline === "all") return true;
        const timestamp = Date.parse(item.deadlineRaw ?? item.deadline);
        if (Number.isNaN(timestamp)) return false;
        const daysRemaining = Math.ceil((timestamp - Date.now()) / 86_400_000);
        if (deadline === "overdue") return daysRemaining < 0;
        if (deadline === "sevenDays") return daysRemaining >= 0 && daysRemaining <= 7;
        return daysRemaining >= 0 && daysRemaining <= 30;
      })
      .sort((left, right) => {
        if (sort === "fit") return right.fitScore - left.fitScore;
        if (sort === "deadline") {
          const leftDate = Date.parse(left.deadlineRaw ?? left.deadline);
          const rightDate = Date.parse(right.deadlineRaw ?? right.deadline);
          if (Number.isNaN(leftDate)) return 1;
          if (Number.isNaN(rightDate)) return -1;
          return leftDate - rightDate;
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [deadline, history, query, risk, sort, status]);

  return (
    <ProtectedRoute>
      <PageHeader eyebrow={t("eyebrow")} title={t("libraryTitle")} description={t("support")} accent="blue" meta={<div className="tm-library-count"><Library aria-hidden="true"/><strong>{history.length}</strong><span>{t("total")}</span></div>} action={<Link href="/" className="tm-button tm-button-dark"><Upload aria-hidden="true" />{dashboard("uploadTender")}</Link>} />
      {isLoading ? <div className="tm-library-skeleton" role="status" aria-live="polite"><span />{t("loading")}</div> : null}
      {error ? <EmptyState title={t("loadFailed")} description={error} actionHref="/" actionLabel={dashboard("uploadTender")} /> : null}
      {!isLoading && !error && history.length === 0 ? <EmptyState title={t("empty")} description={t("emptyDescription")} actionHref="/" actionLabel={dashboard("uploadTender")} /> : null}

      {!isLoading && !error && history.length > 0 ? (
        <section className="tm-library" aria-labelledby="library-results">
          <div className="tm-library-controls">
            <label className="tm-search-field"><Search aria-hidden="true"/><span className="sr-only">{t("searchLabel")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} /></label>
            <div className="tm-filter-group"><SlidersHorizontal aria-hidden="true" />
              <label><span className="sr-only">{t("statusFilter")}</span><select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}><option value="all">{t("allStatuses")}</option>{(["Uploaded", "Extracted", "Analyzed", "Failed"] as const).map((value) => <option key={value} value={value}>{t(`status${value}`)}</option>)}</select></label>
              <label><span className="sr-only">{t("riskFilter")}</span><select value={risk} onChange={(event) => setRisk(event.target.value as RiskFilter)}><option value="all">{t("allRisks")}</option>{(["High", "Medium", "Low"] as const).map((value) => <option key={value} value={value}>{t(`risk${value}`)}</option>)}</select></label>
              <label><span className="sr-only">{t("deadlineFilter")}</span><select value={deadline} onChange={(event) => setDeadline(event.target.value as DeadlineFilter)}><option value="all">{t("allDeadlines")}</option><option value="overdue">{t("deadlineOverdue")}</option><option value="sevenDays">{t("deadlineSevenDays")}</option><option value="thirtyDays">{t("deadlineThirtyDays")}</option></select></label>
              <label><span className="sr-only">{t("sortLabel")}</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}><option value="updated">{t("sortUpdated")}</option><option value="deadline">{t("sortDeadline")}</option><option value="fit">{t("sortFit")}</option></select></label>
            </div>
          </div>
          <div className="tm-library-heading"><h2 id="library-results">{t("results", { count: items.length })}</h2><p>{t("privateNote")}</p></div>
          {items.length === 0 ? <div className="tm-no-results"><strong>{t("noResults")}</strong><span>{t("noResultsSupport")}</span><button type="button" onClick={() => { setQuery(""); setStatus("all"); setRisk("all"); setDeadline("all"); }}>{t("clearFilters")}</button></div> : (
            <div className="tm-tender-table" role="table" aria-label={t("tableLabel")}>
              <div className="tm-table-head" role="row"><span>{t("tender")}</span><span>{t("deadline")}</span><span>{t("status")}</span><span>{t("risk")}</span><span>{t("fit")}</span><span>{t("updated")}</span><span>{common("action")}</span></div>
              {items.map((item) => (
                <article key={item.id} className="tm-table-row" role="row">
                  <div className="tm-table-title"><strong>{item.tenderTitle}</strong><span>{item.organization} · {item.category}</span></div>
                  <span data-label={t("deadline")}>{item.deadline}</span>
                  <span data-label={t("status")}><StatusBadge tone={statusTone(item.status)}>{t(`status${item.status}`)}</StatusBadge></span>
                  <span data-label={t("risk")}><StatusBadge tone={item.riskLevel === "High" ? "danger" : item.riskLevel === "Medium" ? "orange" : "neutral"}>{t(`risk${item.riskLevel}`)}</StatusBadge></span>
                  <strong data-label={t("fit")}>{item.status === "Analyzed" ? `${item.fitScore}%` : "—"}</strong>
                  <span data-label={t("updated")}>{item.updatedDate}</span>
                  <Link href={`/tender/${item.id}`} aria-label={`${t("open")} ${item.tenderTitle}`}>{t("open")}<ArrowRight aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </ProtectedRoute>
  );
}
