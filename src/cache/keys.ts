import type { AppLocale } from "@/i18n/config";

export type CacheKey = readonly ["private" | "public", ...Array<string | number>];

export const cacheKeys = {
  auth: (userId: string): CacheKey => ["private", userId, "auth", "me"],
  dashboard: (userId: string, locale: AppLocale): CacheKey => ["private", userId, "dashboard", locale],
  historyPage: (userId: string, locale: AppLocale, cursor: string | null, limit: number): CacheKey => ["private", userId, "tender-history", locale, cursor ?? "first", limit],
  tender: (userId: string, tenderId: string, locale: AppLocale): CacheKey => ["private", userId, "tender", tenderId, locale],
  report: (userId: string, tenderId: string, reportVersion: string, locale: AppLocale): CacheKey => ["private", userId, "report", tenderId, reportVersion, locale],
  chat: (userId: string, tenderId: string, locale: AppLocale): CacheKey => ["private", userId, "tender-chat", tenderId, locale],
  credits: (userId: string): CacheKey => ["private", userId, "billing-usage"],
  signedPdf: (userId: string, tenderId: string): CacheKey => ["private", userId, "signed-pdf", tenderId],
  securityStatus: (userId: string): CacheKey => ["private", userId, "account-security", "status"],
  securitySessions: (userId: string): CacheKey => ["private", userId, "account-security", "sessions"],
  securityActivity: (userId: string): CacheKey => ["private", userId, "account-security", "activity"],
  publicPlans: (): CacheKey => ["public", "billing-plans"]
} as const;

export function isPrivateKeyForUser(key: unknown, userId: string) {
  return Array.isArray(key) && key[0] === "private" && key[1] === userId;
}

export function isTenderResource(key: unknown, userId: string, tenderId: string) {
  return isPrivateKeyForUser(key, userId) && (key as unknown[]).includes(tenderId);
}
