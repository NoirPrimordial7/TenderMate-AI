"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { cacheKeys } from "@/cache/keys";
import { PRIVATE_SWR_POLICY } from "@/cache/policy";
import { subscribeCacheEvents } from "@/cache/events";
import type { BillingUsage } from "@/domain/billing/types";
import { billingService } from "@/services/BillingService";

export function useBillingUsage(userId: string | null) {
  const abortRef = useRef<AbortController | null>(null);
  const response = useSWR<BillingUsage>(userId ? cacheKeys.credits(userId) : null, async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return billingService.getUsage({ signal: controller.signal, userId: userId ?? undefined });
  }, PRIVATE_SWR_POLICY);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => subscribeCacheEvents((event) => {
    if (event.userId === userId && event.type === "credits-changed") void response.mutate();
  }), [response.mutate, userId]);
  return response;
}
