import type { SWRConfiguration } from "swr";

type RuntimeNavigator = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
};

export const CACHE_POLICY = {
  schemaVersion: 1,
  snapshotTtlMs: 15 * 60_000,
  dedupingIntervalMs: 15_000,
  focusThrottleIntervalMs: 30_000,
  processingPollMs: 4_000,
  lowResourcePollMs: 10_000,
  signedUrlSafetyWindowMs: 15_000,
  historyPageSize: 40
} as const;

export function isLowResourceRuntime(runtimeNavigator: Navigator = navigator) {
  const value = runtimeNavigator as RuntimeNavigator;
  return Boolean(
    value.connection?.saveData ||
    value.connection?.effectiveType === "slow-2g" ||
    value.connection?.effectiveType === "2g" ||
    (typeof value.deviceMemory === "number" && value.deviceMemory <= 2) ||
    value.hardwareConcurrency <= 2
  );
}

export function visibilityAwareInterval(active: boolean, lowResource: boolean, visible = typeof document === "undefined" || document.visibilityState === "visible") {
  if (!active || !visible || (typeof navigator !== "undefined" && !navigator.onLine)) return 0;
  return lowResource ? CACHE_POLICY.lowResourcePollMs : CACHE_POLICY.processingPollMs;
}

export const PRIVATE_SWR_POLICY: SWRConfiguration = {
  keepPreviousData: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: CACHE_POLICY.dedupingIntervalMs,
  focusThrottleInterval: CACHE_POLICY.focusThrottleIntervalMs,
  errorRetryCount: 3,
  errorRetryInterval: 2_000
};

export const IMMUTABLE_REPORT_POLICY: SWRConfiguration = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false
};
