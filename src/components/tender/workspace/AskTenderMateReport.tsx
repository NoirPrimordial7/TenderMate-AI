"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, FileSearch, LoaderCircle, Send, Trash2 } from "lucide-react";
import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import type { TenderAssistantMessage, TenderQuestionHistory, TenderQuestionResponse } from "@/domain/tender/assistant";
import type { SourceReference, TenderRecordView } from "@/domain/tender/types";
import { BRAND } from "@/config/brand";
import type { AppLocale } from "@/i18n/config";
import { ApiError } from "@/services/api";
import { askTenderQuestion, clearTenderQuestionHistory, fetchTenderQuestionHistory } from "@/services/TenderAssistantService";
import { cacheKeys } from "@/cache/keys";
import { mergeChatMessages } from "@/cache/chat";
import { PRIVATE_SWR_POLICY } from "@/cache/policy";
import { publishCacheEvent, subscribeCacheEvents } from "@/cache/events";
import { VerificationWarning } from "@/components/launch/VerificationWarning";

const LANGUAGE_LABELS: Record<AppLocale, string> = { en: "English", hi: "हिंदी", mr: "मराठी" };

function createLocalMessage(content: string, role: "user" | "assistant", language: AppLocale, response?: TenderQuestionResponse): TenderAssistantMessage {
  return {
    id: response?.message_id ?? `local-${crypto.randomUUID()}`,
    conversation_id: response?.conversation_id ?? "",
    tender_id: "",
    role,
    content,
    language,
    scope_status: response?.scope_status ?? "accepted",
    confidence: response?.confidence ?? null,
    citations: response?.citations ?? [],
    not_found: response?.not_found ?? false,
    created_at: new Date().toISOString()
  };
}

function suggestionsFor(tender: TenderRecordView, t: ReturnType<typeof useTranslations>) {
  const analysis = tender.analysis;
  if (!analysis) return [];
  const suggestions: string[] = [];
  if (analysis.eligibility.length) suggestions.push(t("suggestEligibility"));
  if (analysis.documents.length) suggestions.push(t("suggestDocuments"));
  if (analysis.risks.length) suggestions.push(t("suggestRisks"));
  if (analysis.dates.length) suggestions.push(t("suggestDeadline"));
  if (analysis.missingInformation.length) suggestions.push(t("suggestMissing"));
  if (analysis.decision.recommendation) suggestions.push(t("suggestDecision"));
  return suggestions.slice(0, 5);
}

function errorKey(error: unknown) {
  if (!(error instanceof ApiError)) return "errorNetwork";
  if (error.status === 409) return "errorNotReady";
  if (error.status === 422) return "errorInvalidDocument";
  if (error.status === 429) return "errorRateLimit";
  if (error.status === 503) return "errorUnavailable";
  return "errorGeneric";
}

export function AskTenderMateReport({ tender, onSource }: { tender: TenderRecordView; onSource: (source: SourceReference) => void }) {
  const t = useTranslations("assistant");
  const { analysisLocale, setAnalysisLocale } = useLocale();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [pendingMessages, setPendingMessages] = useState<TenderAssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const storedMessagesRef = useRef<TenderAssistantMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const historyKey = user ? cacheKeys.chat(user.id, tender.id, analysisLocale) : null;
  const { data, error: historyError, isLoading, mutate } = useSWR<TenderQuestionHistory>(historyKey, async () => {
    const existing = storedMessagesRef.current;
    const after = existing.at(-1)?.created_at ?? null;
    const next = await fetchTenderQuestionHistory(tender.id, undefined, after);
    return { ...next, messages: mergeChatMessages(existing, next.messages) };
  }, PRIVATE_SWR_POLICY);
  const messages = useMemo(() => mergeChatMessages(data?.messages ?? [], pendingMessages), [data?.messages, pendingMessages]);
  const suggestions = useMemo(() => suggestionsFor(tender, t), [t, tender]);

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => { storedMessagesRef.current = data?.messages ?? []; }, [data?.messages]);
  useEffect(() => subscribeCacheEvents((event) => {
    if (event.type === "chat-answer" && event.userId === user?.id && event.tenderId === tender.id) void mutate();
  }), [mutate, tender.id, user?.id]);
  useEffect(() => { if (messages.length) endRef.current?.scrollIntoView({ block: "nearest" }); }, [messages.length]);
  useEffect(() => {
    const latest = [...messages].reverse().find((message) => message.conversation_id);
    if (latest) setConversationId(latest.conversation_id);
  }, [messages]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || isSending) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setDraft("");
    setError(null);
    setIsSending(true);
    const localUser = createLocalMessage(question, "user", analysisLocale);
    setPendingMessages((current) => [...current, localUser]);
    try {
      const response = await askTenderQuestion(tender.id, question, analysisLocale, conversationId, controller.signal);
      setConversationId(response.conversation_id);
      const assistantMessage = createLocalMessage(response.answer, "assistant", analysisLocale, response);
      await mutate(
        { tender_id: tender.id, messages: mergeChatMessages(data?.messages ?? [], [{ ...localUser, conversation_id: response.conversation_id }], [assistantMessage]) },
        { revalidate: false }
      );
      setPendingMessages([]);
      if (user) publishCacheEvent({ type: "chat-answer", userId: user.id, tenderId: tender.id });
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") return;
      setPendingMessages((current) => current.filter((message) => message !== localUser));
      setDraft(question);
      setError(t(errorKey(nextError)));
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      setIsSending(false);
    }
  }

  async function clearHistory() {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsSending(false);
    setError(null);
    try {
      await clearTenderQuestionHistory(tender.id);
      setPendingMessages([]);
      setConversationId(null);
      setConfirmClear(false);
      await mutate({ tender_id: tender.id, messages: [] }, { revalidate: false });
    } catch (nextError) {
      setError(t(errorKey(nextError)));
    }
  }

  function openCitation(message: TenderAssistantMessage, index: number) {
    const citation = message.citations[index];
    onSource({ page: citation.page, clause: citation.clause, title: citation.title, text: citation.quote, confidence: citation.confidence, extractionMethod: citation.extraction_method === "mixed" ? "mixed" : citation.extraction_method === "ocr" ? "ocr" : "text" });
  }

  return (
    <section className="tm-assistant" aria-labelledby="assistant-title">
      <header className="tm-assistant-header">
        <div><p className="tm-eyebrow">{t("eyebrow")}</p><h2 id="assistant-title">{t("title")}</h2><p>{t("support")}</p></div>
        <div className="tm-assistant-controls">
          <label><span>{t("answerLanguage")}</span><select value={analysisLocale} onChange={(event) => setAnalysisLocale(event.target.value as AppLocale)}>{Object.entries(LANGUAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {messages.length ? <button type="button" disabled={isSending} onClick={() => setConfirmClear(true)}><Trash2 aria-hidden="true" />{t("clearHistory")}</button> : null}
        </div>
      </header>

      <div className="tm-assistant-scope"><FileSearch aria-hidden="true"/><div><strong>{t("scopeTitle")}</strong><span>{t("scopeNotice")}</span></div></div>
      <VerificationWarning compact />
      {confirmClear ? <div className="tm-assistant-confirm" role="alert"><p>{t("clearConfirm")}</p><div><button type="button" onClick={() => setConfirmClear(false)}>{t("cancel")}</button><button type="button" onClick={() => void clearHistory()}>{t("confirmClear")}</button></div></div> : null}
      {error || historyError ? <div className="tm-assistant-error" role="alert"><strong>{t("errorTitle")}</strong><span>{error ?? t("errorHistory")}</span></div> : null}

      <div className="tm-assistant-conversation" aria-live="polite" aria-busy={isLoading || isSending}>
        {isLoading ? <div className="tm-assistant-loading"><LoaderCircle aria-hidden="true"/><span>{t("loadingHistory")}</span></div> : null}
        {!isLoading && !messages.length ? <div className="tm-assistant-empty"><span>?</span><div><h3>{t("emptyTitle")}</h3><p>{t("emptySupport")}</p></div></div> : null}
        {messages.map((message) => <article className="tm-assistant-message" data-role={message.role} key={message.id}>
          <div className="tm-assistant-message-meta"><span>{message.role === "user" ? t("you") : BRAND.name}</span>{message.role === "assistant" && message.confidence != null ? <span>{Math.round(message.confidence * 100)}% {t("confidence")}</span> : null}</div>
          <p>{message.content}</p>
          {message.role === "assistant" && !message.not_found && message.citations.length ? <div className="tm-assistant-citations"><strong><Check aria-hidden="true"/>{t("verifiedSources")}</strong>{message.citations.map((citation, index) => <button type="button" key={`${message.id}-${citation.page}-${index}`} onClick={() => openCitation(message, index)}><span>{t("pageClause", { page: citation.page, clause: citation.clause })}</span><q>{citation.quote}</q><ArrowUpRight aria-hidden="true"/></button>)}</div> : null}
        </article>)}
        {isSending ? <div className="tm-assistant-loading"><LoaderCircle aria-hidden="true"/><span>{t("grounding")}</span></div> : null}
        <div ref={endRef}/>
      </div>

      {!messages.length && suggestions.length ? <div className="tm-assistant-suggestions"><p>{t("suggested")}</p><div>{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setDraft(suggestion)}>{suggestion}<ArrowUpRight aria-hidden="true"/></button>)}</div></div> : null}
      <form className="tm-assistant-composer" onSubmit={submit}>
        <label htmlFor="tender-question">{t("composerLabel")}</label>
        <div><textarea id="tender-question" value={draft} maxLength={1000} rows={2} onChange={(event) => setDraft(event.target.value)} placeholder={t("placeholder")} disabled={isSending}/><button type="submit" disabled={!draft.trim() || isSending} aria-label={t("send")}>{isSending ? <LoaderCircle aria-hidden="true"/> : <Send aria-hidden="true"/>}<span>{t("send")}</span></button></div>
        <small>{t("characterCount", { count: draft.length })}</small>
      </form>
    </section>
  );
}
