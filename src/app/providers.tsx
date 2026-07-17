"use client";

import { type ReactNode } from "react";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { AppRuntime } from "@/components/shell/AppRuntime";
import type { AppLocale } from "@/i18n/config";

const swrConfig = {
  provider: () => new Map(),
  dedupingInterval: 20_000,
  focusThrottleInterval: 60_000,
  revalidateOnReconnect: true,
  shouldRetryOnError: false
};

export default function Providers({ children, initialLocale }: { children: ReactNode; initialLocale: AppLocale | null }) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <SWRConfig value={swrConfig}>
        <AuthProvider>
          <AppRuntime />
          {children}
        </AuthProvider>
      </SWRConfig>
    </LocaleProvider>
  );
}
