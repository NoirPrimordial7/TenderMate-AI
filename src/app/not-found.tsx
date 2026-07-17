"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApplicationShell } from "@/components/shell/ApplicationShell";
import { useTranslations } from "@/contexts/LocaleContext";

export default function NotFound() {
  const t = useTranslations("errors");
  return <ApplicationShell protectedPage={false} className="tm-system-shell"><section className="tm-system-state"><span>404</span><p className="tm-eyebrow">{t("notFoundEyebrow")}</p><h1>{t("notFoundTitle")}</h1><p>{t("notFoundDescription")}</p><Link href="/"><ArrowLeft aria-hidden="true"/>{t("backToUpload")}</Link></section></ApplicationShell>;
}
