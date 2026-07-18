"use client";

import { useEffect, useId, useRef } from "react";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "nividaiq-turnstile";

function loadTurnstileScript() {
  if (document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export function TurnstileWidget({ action, onToken }: { action: "login" | "signup" | "password-reset"; onToken: (token: string | null) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const { activeLocale } = useLocale();
  const t = useTranslations("security");
  const reactId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    loadTurnstileScript();
    let cancelled = false;
    const timer = window.setInterval(() => {
      if (cancelled || !window.turnstile || !containerRef.current || widgetRef.current) return;
      window.clearInterval(timer);
      widgetRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        language: activeLocale,
        appearance: "interaction-only",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null)
      });
    }, 100);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
      onToken(null);
    };
  }, [action, activeLocale, onToken, siteKey]);

  if (!siteKey) return null;
  return <div className="ni-turnstile" id={`turnstile-${reactId}`} ref={containerRef} aria-label={t("turnstileLabel")} />;
}
