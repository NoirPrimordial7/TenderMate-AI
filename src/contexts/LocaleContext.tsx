"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ANALYSIS_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  isAppLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_STORAGE_KEY,
  type AppLocale
} from "@/i18n/config";
import { translateMessage, type MessageValues } from "@/i18n/messages";
import { LanguageGate } from "@/components/language/LanguageGate";

type SetLocaleOptions = {
  focusApp?: boolean;
  persist?: boolean;
};

type LocaleContextValue = {
  locale: AppLocale | null;
  activeLocale: AppLocale;
  analysisLocale: AppLocale;
  setLocale: (locale: AppLocale, options?: SetLocaleOptions) => void;
  setAnalysisLocale: (locale: AppLocale) => void;
  selectInitialLocale: (locale: AppLocale) => void;
  t: (key: string, values?: MessageValues) => string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function persistLocale(locale: AppLocale) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

function focusFirstAppControl() {
  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLElement>("[data-locale-focus]") ??
        document.querySelector<HTMLElement>("main button:not([disabled])") ??
        document.querySelector<HTMLElement>("main a[href]") ??
        document.querySelector<HTMLElement>("header a[href]");
      target?.focus({ preventScroll: true });
    });
  }, 40);
}

export function LocaleProvider({
  children,
  initialLocale
}: {
  children: ReactNode;
  initialLocale: AppLocale | null;
}) {
  const [locale, setLocaleState] = useState<AppLocale | null>(initialLocale);
  const [analysisLocale, setAnalysisLocaleState] = useState<AppLocale>(initialLocale ?? DEFAULT_LOCALE);
  const activeLocale = locale ?? DEFAULT_LOCALE;

  const setLocale = useCallback((nextLocale: AppLocale, options: SetLocaleOptions = {}) => {
    const { focusApp = false, persist = true } = options;
    setLocaleState(nextLocale);
    if (persist) persistLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    document.title = translateMessage(nextLocale, "common.brandHome");
    if (focusApp) focusFirstAppControl();
  }, []);

  const setAnalysisLocale = useCallback((nextLocale: AppLocale) => {
    setAnalysisLocaleState(nextLocale);
    window.localStorage.setItem(ANALYSIS_LOCALE_STORAGE_KEY, nextLocale);
  }, []);

  const selectInitialLocale = useCallback((nextLocale: AppLocale) => {
    setAnalysisLocale(nextLocale);
    setLocale(nextLocale, { focusApp: true });
  }, [setAnalysisLocale, setLocale]);

  useEffect(() => {
    if (initialLocale) {
      document.documentElement.lang = initialLocale;
      const storedAnalysisLocale = window.localStorage.getItem(ANALYSIS_LOCALE_STORAGE_KEY);
      if (isAppLocale(storedAnalysisLocale)) setAnalysisLocaleState(storedAnalysisLocale);
      return;
    }

    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!isAppLocale(storedLocale)) return;
    const storedAnalysisLocale = window.localStorage.getItem(ANALYSIS_LOCALE_STORAGE_KEY);
    setAnalysisLocaleState(isAppLocale(storedAnalysisLocale) ? storedAnalysisLocale : storedLocale);
    setLocale(storedLocale);
  }, [initialLocale, setLocale]);

  const t = useCallback(
    (key: string, values?: MessageValues) => translateMessage(activeLocale, key, values),
    [activeLocale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, activeLocale, analysisLocale, setLocale, setAnalysisLocale, selectInitialLocale, t }),
    [activeLocale, analysisLocale, locale, selectInitialLocale, setAnalysisLocale, setLocale, t]
  );

  return (
    <LocaleContext.Provider value={value}>
      {locale ? children : <LanguageGate onComplete={selectInitialLocale} />}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider.");
  return context;
}

export function useTranslations(namespace?: string) {
  const { t } = useLocale();
  return useCallback(
    (key: string, values?: MessageValues) => t(namespace ? `${namespace}.${key}` : key, values),
    [namespace, t]
  );
}
