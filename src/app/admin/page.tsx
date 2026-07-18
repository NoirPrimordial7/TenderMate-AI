"use client";

import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import { adminCacheKey } from "@/cache/keys";
import { adminService } from "@/services/AdminService";

export default function AdminOverviewPage() {
  const { user } = useAuth(); const { activeLocale } = useLocale(); const t = useTranslations("admin");
  const key = user ? adminCacheKey(user.id, user.role, "overview", "none", null, activeLocale) : null;
  const { data, error } = useSWR(key, () => adminService.overview());
  return <main className="na-content"><div className="na-heading"><div><p>{t("operations")}</p><h1>{t("overview")}</h1></div><span className="na-health">{data?.system_health ?? t("checking")}</span></div>
    {error ? <div className="na-error" role="alert">{t("safeError")}</div> : <section className="na-metrics" aria-label={t("metrics")}>{Object.entries(data?.metrics ?? {}).map(([name, value]) => <article key={name}><span>{name.replaceAll("_", " ")}</span><strong>{value ?? t("unavailable")}</strong></article>)}</section>}
  </main>;
}
