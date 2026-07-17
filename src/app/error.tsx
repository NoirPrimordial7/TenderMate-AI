"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { ApplicationShell } from "@/components/shell/ApplicationShell";
import { useTranslations } from "@/contexts/LocaleContext";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => { console.error("TenderMate route error", error.digest ?? error.name); }, [error]);
  return <ApplicationShell protectedPage={false} className="tm-system-shell"><section className="tm-system-state tm-system-error"><span>!</span><p className="tm-eyebrow">{t("routeErrorEyebrow")}</p><h1>{t("routeErrorTitle")}</h1><p>{t("routeErrorDescription")}</p><button type="button" onClick={reset}><RefreshCw aria-hidden="true"/>{t("tryAgain")}</button></section></ApplicationShell>;
}
