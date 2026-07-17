import en from "../../messages/en.json";
import hi from "../../messages/hi.json";
import mr from "../../messages/mr.json";
import type { AppLocale } from "@/i18n/config";

export type MessageValues = Record<string, string | number>;
export type MessageTree = Record<string, unknown>;

export const MESSAGES: Record<AppLocale, MessageTree> = { en, hi, mr };

export function translateMessage(
  locale: AppLocale,
  key: string,
  values: MessageValues = {}
) {
  const segments = key.split(".");
  let current: unknown = MESSAGES[locale];

  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      current = undefined;
      break;
    }
    current = (current as MessageTree)[segment];
  }

  if (typeof current !== "string") {
    let fallback: unknown = MESSAGES.en;
    for (const segment of segments) {
      if (!fallback || typeof fallback !== "object" || !(segment in fallback)) {
        fallback = key;
        break;
      }
      fallback = (fallback as MessageTree)[segment];
    }
    current = typeof fallback === "string" ? fallback : key;
  }

  const message = typeof current === "string" ? current : key;
  return message.replace(/\{(\w+)\}/g, (match: string, token: string) =>
    token in values ? String(values[token]) : match
  );
}
