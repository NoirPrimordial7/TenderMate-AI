"use client";

import { Languages } from "lucide-react";
import { LOCALE_OPTIONS, type AppLocale } from "@/i18n/config";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

type LanguageSwitcherProps = {
  compact?: boolean;
  onSelect?: () => void;
};

export function LanguageSwitcher({ compact = false, onSelect }: LanguageSwitcherProps) {
  const { activeLocale, setLocale } = useLocale();
  const { isAuthenticated, updateLanguagePreferences } = useAuth();
  const t = useTranslations("language");
  const [saveMessage, setSaveMessage] = useState("");

  const select = async (locale: AppLocale) => {
    setSaveMessage("");
    setLocale(locale);
    if (isAuthenticated) {
      const updated = await updateLanguagePreferences({ preferred_language: locale });
      if (!updated) setSaveMessage(t("saveFailed"));
    }
    onSelect?.();
  };

  return (
    <div className={`te-language-switcher ${compact ? "te-language-switcher-compact" : ""}`}>
      <p><Languages aria-hidden="true" /> {t("switchLabel")}</p>
      <div role="group" aria-label={t("interfaceLabel")}>
        {LOCALE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={activeLocale === option.value ? "te-language-current" : ""}
            aria-pressed={activeLocale === option.value}
            onClick={() => void select(option.value)}
          >
            {t(option.nativeKey)}
          </button>
        ))}
      </div>
      {saveMessage ? <span className="te-language-save-message" role="status">{saveMessage}</span> : null}
    </div>
  );
}
