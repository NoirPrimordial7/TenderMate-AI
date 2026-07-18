"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { cacheKeys } from "@/cache/keys";
import { isLowResourceRuntime, PRIVATE_SWR_POLICY, visibilityAwareInterval } from "@/cache/policy";
import { subscribeCacheEvents } from "@/cache/events";
import type { TenderRecordView } from "@/domain/tender/types";
import type { AppLocale } from "@/i18n/config";
import { tenderService } from "@/services/TenderService";

const ACTIVE_STATUSES = new Set(["uploaded", "extracting", "extracted", "analyzing", "processing"]);

export function useTenderRecord(userId: string | null, tenderId: string, locale: AppLocale) {
  const abortRef = useRef<AbortController | null>(null);
  const response = useSWR<TenderRecordView | null>(userId ? cacheKeys.tender(userId, tenderId, locale) : null, async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return tenderService.getBackendTenderDetails(tenderId, { signal: controller.signal, userId: userId ?? undefined });
  }, {
    ...PRIVATE_SWR_POLICY,
    refreshInterval: (data) => visibilityAwareInterval(Boolean(data && ACTIVE_STATUSES.has(data.status)), typeof navigator !== "undefined" && isLowResourceRuntime())
  });
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => subscribeCacheEvents((event) => {
    if (event.userId === userId && event.tenderId === tenderId && event.type !== "credits-changed") void response.mutate();
  }), [response.mutate, tenderId, userId]);
  return response;
}
