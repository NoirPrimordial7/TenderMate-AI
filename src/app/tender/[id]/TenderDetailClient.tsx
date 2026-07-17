"use client";

import useSWR from "swr";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import { TenderProcessor } from "@/components/tender/TenderProcessor";
import { TenderWorkspace } from "@/components/tender/TenderWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/contexts/LocaleContext";
import type { TenderRecordView } from "@/domain/tender/types";
import { tenderService } from "@/services/TenderService";
import { toFriendlyApiMessage } from "@/services/api";

export default function TenderDetailClient({ id }: { id: string }) {
  const { isAuthenticated, user } = useAuth();
  const t = useTranslations("workspace");
  const history = useTranslations("history");
  const { data: tender, error, isLoading, mutate } = useSWR<TenderRecordView | null>(isAuthenticated && user ? ["private", user.id, "tender", id] : null, () => tenderService.getBackendTenderDetails(id), { revalidateOnFocus: true });

  return (
    <ProtectedRoute>
      {isLoading ? <div className="tm-workspace-loading" role="status" aria-live="polite"><span />{t("loading")}</div> : null}
      {error ? <EmptyState title={t("tenderNotFound")} description={toFriendlyApiMessage(error, t("loadFailed"))} actionHref="/history" actionLabel={history("title")} /> : null}
      {!isLoading && !error && tender === null ? <EmptyState title={t("tenderNotFound")} description={t("notOwned")} actionHref="/history" actionLabel={history("title")} /> : null}
      {tender && !tender.analysis ? <TenderProcessor tender={tender} onRefresh={() => mutate()} /> : null}
      {tender?.analysis ? <TenderWorkspace tender={tender} /> : null}
    </ProtectedRoute>
  );
}
