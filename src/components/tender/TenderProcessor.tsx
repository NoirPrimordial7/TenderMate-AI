"use client";

import { useState } from "react";
import { ArrowRight, CircleAlert, FileCog } from "lucide-react";
import { ProcessingTimeline } from "@/components/tender/ProcessingTimeline";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/contexts/LocaleContext";
import type { TenderRecordView } from "@/domain/tender/types";
import { tenderService } from "@/services/TenderService";
import { ApiError, toFriendlyApiMessage } from "@/services/api";
import { getProcessingStages } from "@/services/tenderWorkspace";

type TenderProcessorProps = { tender: TenderRecordView; onRefresh: () => Promise<TenderRecordView | null | undefined> };

export function TenderProcessor({ tender, onRefresh }: TenderProcessorProps) {
  const { refreshUser, user } = useAuth();
  const t = useTranslations("processing");
  const common = useTranslations("common");
  const [active, setActive] = useState<"extracting" | "analyzing" | null>(null);
  const [error, setError] = useState("");
  const [reviewRequired, setReviewRequired] = useState(false);
  const credits = typeof user?.free_analysis_credits === "number" ? Math.max(0, user.free_analysis_credits) : null;
  const activeSubscription = user?.subscription_status?.toLowerCase() === "active";
  const canAnalyze = activeSubscription || credits === null || credits > 0;
  const hasExtractedText = Boolean(tender.extractedTextPreview);
  const extractionComplete = tender.status === "extracted" || Boolean((tender.pageCount ?? 0) > 0);
  const stages = getProcessingStages(tender, active);
  const extractionMethod = !extractionComplete
    ? common("pending")
    : tender.extractionMethod === "mixed"
      ? t("mixedExtraction")
      : tender.ocrUsed || tender.extractionMethod === "gemini_ocr"
        ? t("tenderMateOcr")
        : hasExtractedText
          ? t("selectableText")
          : t("ocrRequired");

  const processTender = async () => {
    if (active) return;
    setError("");
    setReviewRequired(false);
    try {
      let current = tender;
      if (current.documentType === "non_tender" || current.documentValidationStatus === "invalid") {
        setError(t("notTender"));
        return;
      }
      if (!extractionComplete || !hasExtractedText) {
        setActive("extracting");
        const extraction = await tenderService.extractTenderText(tender.id);
        current = (await onRefresh()) ?? current;
        if (extraction.pages_with_text === 0) {
          setError(t("ocrUnreadable"));
          return;
        }
        if (current.documentType === "non_tender" || current.documentValidationStatus === "invalid") {
          setError(t("notTender"));
          return;
        }
        if (current.documentType === "uncertain" || current.documentValidationStatus === "review") {
          setReviewRequired(true);
          return;
        }
      }
      if (!canAnalyze) {
        setError(t("noCredits"));
        return;
      }
      if (!current.analysis) {
        setActive("analyzing");
        await tenderService.analyzeTender(tender.id);
        await Promise.all([onRefresh(), refreshUser()]);
      }
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (cause.status === 401) setError(t("errors.unauthorized"));
        else if (cause.status === 402) setError(t("errors.payment"));
        else if (cause.status === 413) setError(t("errors.tooLarge"));
        else if (cause.status === 429) setError(t("errors.rateLimited"));
        else if (cause.status === 422) setError(t("notTender"));
        else if (cause.status >= 500) setError(t("errors.server"));
        else setError(toFriendlyApiMessage(cause, t("errors.failed")));
      } else setError(toFriendlyApiMessage(cause, t("errors.network")));
      await onRefresh();
    } finally {
      setActive(null);
    }
  };

  return (
    <div className="tm-processing-layout">
      <section className="tm-processing-lead" aria-labelledby="process-tender-title">
        <StatusBadge tone={tender.status === "failed" || tender.status === "upload_failed" ? "danger" : extractionComplete ? "violet" : "blue"}>{t(`state.${tender.status}`)}</StatusBadge>
        <FileCog aria-hidden="true"/>
        <p className="tm-eyebrow">{t("eyebrow")}</p>
        <h1 id="process-tender-title">{t("title")}</h1>
        <p>{t("support")}</p>
        <dl><div><dt>{t("file")}</dt><dd>{tender.originalFileName ?? tender.title}</dd></div><div><dt>{common("pages")}</dt><dd>{tender.pageCount ?? common("pending")}</dd></div><div><dt>{t("method")}</dt><dd>{extractionMethod}</dd></div><div><dt>{common("credits")}</dt><dd>{credits ?? common("unavailable")}</dd></div></dl>
        {reviewRequired || tender.documentValidationStatus === "review" ? <div className="tm-processing-warning" role="status"><CircleAlert aria-hidden="true"/><p>{t("uncertainDocument")}</p></div> : null}
        {error || tender.errorMessage ? <div className="tm-processing-error" role="alert"><CircleAlert aria-hidden="true"/><p>{error || tender.errorMessage}</p></div> : null}
        <button type="button" className="tm-process-button" onClick={processTender} disabled={Boolean(active)}>{active ? t(active) : tender.status === "failed" ? t("retry") : t("process")}<ArrowRight aria-hidden="true"/></button>
        <small>{t("truthNote")}</small>
      </section>
      <section className="tm-processing-stages"><p className="tm-eyebrow">{t("liveStages")}</p><h2>{active ? t("working") : t("storedState")}</h2><ProcessingTimeline stages={stages}/></section>
    </div>
  );
}
