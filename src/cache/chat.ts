import type { TenderAssistantMessage } from "@/domain/tender/assistant";

export function mergeChatMessages(...groups: TenderAssistantMessage[][]) {
  const byId = new Map<string, TenderAssistantMessage>();
  for (const message of groups.flat()) byId.set(message.id, message);
  return Array.from(byId.values()).sort((left, right) => left.created_at.localeCompare(right.created_at));
}
