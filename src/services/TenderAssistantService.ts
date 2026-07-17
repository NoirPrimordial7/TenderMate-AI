import type { AppLocale } from "@/i18n/config";
import type { TenderQuestionHistory, TenderQuestionResponse } from "@/domain/tender/assistant";
import { apiRequest } from "@/services/api";

export function fetchTenderQuestionHistory(tenderId: string, signal?: AbortSignal) {
  return apiRequest<TenderQuestionHistory>(`/tenders/${tenderId}/questions/history`, { signal });
}

export function askTenderQuestion(tenderId: string, question: string, language: AppLocale, conversationId: string | null, signal?: AbortSignal) {
  return apiRequest<TenderQuestionResponse>(`/tenders/${tenderId}/questions`, {
    method: "POST",
    body: { question, language, conversation_id: conversationId },
    signal
  });
}

export function clearTenderQuestionHistory(tenderId: string) {
  return apiRequest<void>(`/tenders/${tenderId}/questions/history`, { method: "DELETE" });
}
