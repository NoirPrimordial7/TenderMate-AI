"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ExternalLink, Minus, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/contexts/LocaleContext";
import type { SourceReference } from "@/domain/tender/types";
import { tenderService } from "@/services/TenderService";
import { cacheKeys } from "@/cache/keys";
import { CACHE_POLICY } from "@/cache/policy";
import { toFriendlyApiMessage } from "@/services/api";

type StoredPdfViewerProps = { tenderId: string; source: SourceReference | null; pageCount?: number | null };

export function StoredPdfViewer({ tenderId, source, pageCount }: StoredPdfViewerProps) {
  const { user } = useAuth();
  const t = useTranslations("pdfViewer");
  const common = useTranslations("common");
  const [page, setPage] = useState(source?.page ?? 1);
  const [zoom, setZoom] = useState(100);
  const { data, error, isLoading, mutate } = useSWR(user ? cacheKeys.signedPdf(user.id, tenderId) : null, async () => ({ ...(await tenderService.getTenderSource(tenderId)), fetchedAt: Date.now() }), {
    revalidateOnFocus: true,
    dedupingInterval: 5_000,
    refreshInterval: (source) => source ? Math.max(5_000, source.fetchedAt + source.expires_in * 1_000 - CACHE_POLICY.signedUrlSafetyWindowMs - Date.now()) : 0
  });
  useEffect(() => { if (source?.page) setPage(source.page); }, [source?.page]);
  const viewerUrl = useMemo(() => data?.signed_url ? `${data.signed_url}#page=${page}&zoom=${zoom}` : "", [data?.signed_url, page, zoom]);
  return (
    <section className="tm-source-workspace" aria-labelledby="source-workspace-title">
      <div className="tm-source-toolbar"><div><p className="tm-eyebrow">{t("storedSource")}</p><h2 id="source-workspace-title">{data?.file_name ?? t("sourcePdf")}</h2></div><div className="tm-source-controls"><label><span>{common("page")}</span><input type="number" min={1} max={pageCount ?? undefined} value={page} onChange={(event) => setPage(Math.max(1, Number(event.target.value) || 1))}/>{pageCount ? <small>/ {pageCount}</small> : null}</label><button type="button" onClick={() => setZoom((value) => Math.max(50, value - 25))} aria-label={t("zoomOut")}><Minus aria-hidden="true"/></button><span>{zoom}%</span><button type="button" onClick={() => setZoom((value) => Math.min(200, value + 25))} aria-label={t("zoomIn")}><Plus aria-hidden="true"/></button>{data ? <a href={data.signed_url} target="_blank" rel="noreferrer">{t("openOriginal")}<ExternalLink aria-hidden="true"/></a> : null}</div></div>
      <div className="tm-source-body">
        <div className="tm-source-frame">{isLoading ? <div className="tm-source-loading">{t("loadingPrivate")}</div> : error ? <div className="tm-source-error"><p>{toFriendlyApiMessage(error, t("sourceFailed"))}</p><button type="button" onClick={() => void mutate()}><RefreshCw aria-hidden="true"/>{common("retry")}</button></div> : viewerUrl ? <iframe title={t("sourcePdf")} src={viewerUrl} /> : null}</div>
        <aside className="tm-source-quote"><p className="tm-eyebrow">{t("sourceReference")}</p>{source ? <><strong>{t("pageClause", { page: source.page, clause: source.clause })}</strong><h3>{source.title}</h3><blockquote>{source.text}</blockquote><p>{t("quoteNote")}</p></> : <p>{t("selectSource")}</p>}</aside>
      </div>
    </section>
  );
}
