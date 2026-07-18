"use client";

import useSWR from "swr";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import { TenderProcessor } from "@/components/tender/TenderProcessor";
import { TenderWorkspace } from "@/components/tender/workspace/TenderWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import { toFriendlyApiMessage } from "@/services/api";
import { useTenderRecord } from "@/hooks/useTenderRecord";
import { cacheKeys } from "@/cache/keys";
import { IMMUTABLE_REPORT_POLICY } from "@/cache/policy";
import type { TenderRecordView } from "@/domain/tender/types";

export default function TenderDetailClient({ id }: { id: string }) {
  const { isAuthenticated, user } = useAuth();
  const { activeLocale } = useLocale();
  const t = useTranslations("workspace");
  const history = useTranslations("history");
  const cache = useTranslations("cache");
  const { data: tender, error, isLoading, isValidating, mutate } = useTenderRecord(isAuthenticated && user ? user.id : null, id, activeLocale);
  const reportVersion = tender?.analysis ? `${tender.schemaVersion ?? tender.analysis.schemaVersion ?? "1.0"}:${tender.updatedAt}` : null;
  const { data: cachedReport } = useSWR<TenderRecordView>(user && tender?.analysis && reportVersion ? cacheKeys.report(user.id, id, reportVersion, activeLocale) : null, null, { ...IMMUTABLE_REPORT_POLICY, fallbackData: tender?.analysis ? tender : undefined });

  return (
    <ProtectedRoute>
      {isLoading ? <div className="tm-workspace-loading" role="status" aria-live="polite"><span />{t("loading")}</div> : null}
      {isValidating && tender ? <p className="tm-cache-status" role="status">{cache("checking")}</p> : null}
      {error ? <EmptyState title={t("tenderNotFound")} description={toFriendlyApiMessage(error, t("loadFailed"))} actionHref="/history" actionLabel={history("title")} /> : null}
      {!isLoading && !error && tender === null ? <EmptyState title={t("tenderNotFound")} description={t("notOwned")} actionHref="/history" actionLabel={history("title")} /> : null}
      {tender && !tender.analysis ? <TenderProcessor tender={tender} onRefresh={() => mutate()} /> : null}
      {cachedReport?.analysis ? <TenderWorkspace tender={cachedReport} /> : null}
    </ProtectedRoute>
  );
}
