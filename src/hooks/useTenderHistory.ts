"use client";

import { useEffect, useMemo, useRef } from "react";
import useSWRInfinite from "swr/infinite";
import { cacheKeys } from "@/cache/keys";
import { CACHE_POLICY, PRIVATE_SWR_POLICY } from "@/cache/policy";
import { readHistorySnapshot, writeHistorySnapshot } from "@/cache/persistent";
import { subscribeCacheEvents } from "@/cache/events";
import type { HistoryTender } from "@/domain/tender/types";
import type { AppLocale } from "@/i18n/config";
import type { TenderHistoryPage } from "@/repositories/BackendTenderRepository";
import { tenderService } from "@/services/TenderService";

export function useTenderHistory(userId: string | null, locale: AppLocale) {
  const controllersRef = useRef(new Set<AbortController>());
  const snapshot = useMemo(() => userId ? readHistorySnapshot(userId) : undefined, [userId]);
  const fallbackData = snapshot?.length ? [{ items: snapshot, nextCursor: null }] : undefined;
  const getKey = (pageIndex: number, previous: TenderHistoryPage | null) => {
    if (!userId || (previous && !previous.nextCursor)) return null;
    return cacheKeys.historyPage(userId, locale, pageIndex === 0 ? null : previous?.nextCursor ?? null, CACHE_POLICY.historyPageSize);
  };
  const response = useSWRInfinite<TenderHistoryPage>(
    getKey,
    async (key) => {
      const controller = new AbortController();
      controllersRef.current.add(controller);
      try {
        return await tenderService.getBackendTenderPage({ userId: String(key[1]), limit: Number(key[5]), cursor: key[4] === "first" ? null : String(key[4]), signal: controller.signal });
      } finally {
        controllersRef.current.delete(controller);
      }
    },
    { ...PRIVATE_SWR_POLICY, fallbackData, revalidateFirstPage: true, persistSize: true }
  );
  const items = useMemo(() => {
    const byId = new Map<string, HistoryTender>();
    for (const item of response.data?.flatMap((page) => page.items) ?? []) byId.set(item.id, item);
    return Array.from(byId.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [response.data]);
  useEffect(() => () => { controllersRef.current.forEach((controller) => controller.abort()); controllersRef.current.clear(); }, []);
  useEffect(() => { if (userId && items.length && !response.error) writeHistorySnapshot(userId, items); }, [items, response.error, userId]);
  useEffect(() => subscribeCacheEvents((event) => {
    if (event.userId === userId && event.type !== "chat-answer") void response.mutate();
  }), [response.mutate, userId]);
  return {
    ...response,
    items,
    hasCachedData: Boolean(snapshot?.length),
    isInitialLoading: response.isLoading && !items.length,
    isRefreshing: response.isValidating && items.length > 0,
    hasMore: Boolean(response.data?.at(-1)?.nextCursor),
    latestUpdatedAt: items[0]?.updatedAt ?? null,
    loadMore: () => response.setSize((size) => size + 1)
  };
}
