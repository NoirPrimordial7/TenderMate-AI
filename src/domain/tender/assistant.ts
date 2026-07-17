import type { AppLocale } from "@/i18n/config";

export type AssistantScopeStatus = "accepted" | "rejected" | "uncertain";

export type TenderAssistantCitation = {
  page: number;
  clause: string;
  title: string;
  quote: string;
  confidence: number | null;
  extraction_method?: string | null;
};

export type TenderAssistantMessage = {
  id: string;
  conversation_id: string;
  tender_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  language: AppLocale;
  scope_status: AssistantScopeStatus;
  confidence: number | null;
  citations: TenderAssistantCitation[];
  not_found: boolean;
  created_at: string;
};

export type TenderQuestionResponse = {
  answer: string;
  language: AppLocale;
  scope_status: AssistantScopeStatus;
  confidence: number | null;
  citations: TenderAssistantCitation[];
  not_found: boolean;
  conversation_id: string;
  message_id: string;
};

export type TenderQuestionHistory = {
  tender_id: string;
  messages: TenderAssistantMessage[];
};
