import type { HistoryTender } from "@/domain/tender/types";
import { CACHE_POLICY } from "@/cache/policy";

const STORAGE_PREFIX = "nividaiq:ui-cache";

type HistorySnapshot = {
  schema: number;
  userId: string;
  savedAt: number;
  items: HistoryTender[];
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}:history`;
}

export function readHistorySnapshot(userId: string, now = Date.now()): HistoryTender[] | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return undefined;
    const snapshot = JSON.parse(raw) as HistorySnapshot;
    if (snapshot.schema !== CACHE_POLICY.schemaVersion || snapshot.userId !== userId || now - snapshot.savedAt > CACHE_POLICY.snapshotTtlMs) {
      localStorage.removeItem(storageKey(userId));
      return undefined;
    }
    return Array.isArray(snapshot.items) ? snapshot.items : undefined;
  } catch {
    localStorage.removeItem(storageKey(userId));
    return undefined;
  }
}

export function writeHistorySnapshot(userId: string, items: HistoryTender[], now = Date.now()) {
  if (typeof localStorage === "undefined") return;
  const safeItems = items.slice(0, 80).map((item) => ({
    id: item.id,
    tenderTitle: item.tenderTitle,
    organization: item.organization,
    uploadDate: item.uploadDate,
    uploadDateRaw: item.uploadDateRaw,
    updatedDate: item.updatedDate,
    updatedAt: item.updatedAt,
    deadline: item.deadline,
    deadlineRaw: item.deadlineRaw,
    status: item.status,
    riskLevel: item.riskLevel,
    fitScore: item.fitScore,
    category: item.category,
    recommendation: item.recommendation,
    missingDocuments: item.missingDocuments,
    documentType: item.documentType,
    documentValidationStatus: item.documentValidationStatus,
    documentValidationConfidence: item.documentValidationConfidence,
    documentValidationReason: item.documentValidationReason
  }));
  const snapshot: HistorySnapshot = { schema: CACHE_POLICY.schemaVersion, userId, savedAt: now, items: safeItems };
  try { localStorage.setItem(storageKey(userId), JSON.stringify(snapshot)); } catch { /* Storage is optional. */ }
}

export function clearPersistentPrivateCache(userId?: string) {
  if (typeof localStorage === "undefined") return;
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(userId ? `${STORAGE_PREFIX}:${userId}:` : `${STORAGE_PREFIX}:`)) localStorage.removeItem(key);
  }
}

export function containsProhibitedPersistentData(value: string) {
  return /signed_url|authorization|access_token|refresh_token|pdf_url|extracted_text|analysis_json|chat_messages/i.test(value);
}
