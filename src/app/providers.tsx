"use client";

import { type ReactNode } from "react";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { AppRuntime } from "@/components/shell/AppRuntime";
import type { AppLocale } from "@/i18n/config";
import { CACHE_POLICY } from "@/cache/policy";
import { isApiError } from "@/services/api";
import { PerformanceModeProvider } from "@/contexts/PerformanceModeContext";
import { LaunchFooter } from "@/components/launch/LaunchFooter";
import { ProductFeedback } from "@/components/launch/ProductFeedback";
import { LegalAcceptanceGate } from "@/components/launch/LegalAcceptanceGate";

const memoryCache = new Map();
const swrConfig = {
  provider: () => memoryCache,
  dedupingInterval: CACHE_POLICY.dedupingIntervalMs,
  focusThrottleInterval: CACHE_POLICY.focusThrottleIntervalMs,
  revalidateOnReconnect: true,
  revalidateOnFocus: true,
  keepPreviousData: true,
  isPaused: () => typeof navigator !== "undefined" && !navigator.onLine,
  onErrorRetry: (error: unknown, _key: unknown, _config: unknown, revalidate: (options: { retryCount: number }) => void, options: { retryCount: number }) => {
    if ((isApiError(error) && [400, 401, 403, 404, 422, 429].includes(error.status)) || options.retryCount >= 3) return;
    const delay = Math.min(30_000, 2_000 * 2 ** options.retryCount);
    window.setTimeout(() => revalidate({ retryCount: options.retryCount + 1 }), delay);
  }
};

export default function Providers({ children, initialLocale }: { children: ReactNode; initialLocale: AppLocale | null }) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <PerformanceModeProvider>
        <SWRConfig value={swrConfig}>
          <AuthProvider>
            <AppRuntime />
            <LegalAcceptanceGate />
            {children}
            <LaunchFooter />
            <ProductFeedback />
          </AuthProvider>
        </SWRConfig>
      </PerformanceModeProvider>
    </LocaleProvider>
  );
}
