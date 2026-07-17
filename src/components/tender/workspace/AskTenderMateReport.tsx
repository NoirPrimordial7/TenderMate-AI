"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "@/contexts/LocaleContext";

export function AskTenderMateReport() {
  const t = useTranslations("workspace");
  return <div className="tm-ask-foundation"><span>AI</span><p className="tm-eyebrow">{t("askEyebrow")}</p><h2>{t("askTitle")}</h2><p>{t("askSupport")}</p><div><FileText aria-hidden="true"/>{t("askScope")}</div><button type="button" disabled>{t("comingNext")}</button></div>;
}
