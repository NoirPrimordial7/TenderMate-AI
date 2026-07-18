"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import { adminCacheKey } from "@/cache/keys";
import { adminService } from "@/services/AdminService";

export default function AdminUsersPage() {
  const [search, setSearch] = useState(""); const { user } = useAuth(); const { activeLocale } = useLocale(); const t = useTranslations("admin");
  const query = new URLSearchParams({ limit: "40", ...(search.trim() ? { search: search.trim() } : {}) }).toString();
  const key = user ? adminCacheKey(user.id, user.role, "users", search.trim(), null, activeLocale) : null;
  const { data, error, isLoading } = useSWR(key, () => adminService.users(query));
  return <main className="na-content"><div className="na-heading"><div><p>{t("operations")}</p><h1>{t("users")}</h1></div><label>{t("search")}<input value={search} onChange={(event) => setSearch(event.target.value.slice(0, 100))} /></label></div>
    {isLoading ? <div className="na-loading">{t("loading")}</div> : error ? <div className="na-error" role="alert">{t("safeError")}</div> : <div className="na-table-wrap"><table><thead><tr>{["name","email","status","role","plan","credits","tenders","activity"].map((item) => <th scope="col" key={item}>{t(item)}</th>)}</tr></thead><tbody>{data?.items.map((item) => <tr key={item.id}><td><Link href={`/admin/users/${item.id}`}>{item.full_name}</Link><small>{item.id}</small></td><td>{item.email}</td><td>{item.account_status}<small>{item.email_verified ? t("verified") : t("unverified")} · {item.mfa_enabled ? "MFA" : t("noMfa")}</small></td><td>{item.role}</td><td>{item.plan_name}</td><td>{item.analysis_credits} / {item.question_credits}</td><td>{item.tender_count}</td><td>{item.last_active_at ?? t("unavailable")}</td></tr>)}</tbody></table></div>}
  </main>;
}
