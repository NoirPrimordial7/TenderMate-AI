export const SUPPORTED_LOCALES = ["en", "hi", "mr"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE = "tm_locale";
export const LOCALE_STORAGE_KEY = "tendermate.locale";
export const ANALYSIS_LOCALE_STORAGE_KEY = "tendermate.analysis_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as AppLocale);
}

export const LOCALE_OPTIONS: Array<{
  value: AppLocale;
  nativeKey: string;
  englishKey: string;
  ariaKey: string;
}> = [
  { value: "en", nativeKey: "englishNative", englishKey: "englishEnglish", ariaKey: "selectEnglish" },
  { value: "hi", nativeKey: "hindiNative", englishKey: "hindiEnglish", ariaKey: "selectHindi" },
  { value: "mr", nativeKey: "marathiNative", englishKey: "marathiEnglish", ariaKey: "selectMarathi" }
];
