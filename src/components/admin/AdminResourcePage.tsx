"use client";

import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import { adminCacheKey } from "@/cache/keys";
import { adminService } from "@/services/AdminService";

export function AdminResourcePage({ resource }: { resource: string }) {
  const { user } = useAuth(); const { activeLocale } = useLocale(); const t = useTranslations("admin");
  const key = user ? adminCacheKey(user.id, user.role, resource, "none", null, activeLocale) : null;
  const { data, error, isLoading, isValidating } = useSWR<Record<string, unknown>[]>(key, () => adminService.rows(resource));
  const rows = Array.isArray(data) ? data : [];
  const columns = rows[0] ? Object.keys(rows[0]).filter((key) => !["metadata", "internal_notes", "message"].includes(key)).slice(0, 8) : [];
  return <main className="na-content"><div className="na-heading"><div><p>{t("operations")}</p><h1>{t(resource)}</h1></div>{isValidating && data ? <span role="status">{t("refreshing")}</span> : null}</div>
    {isLoading ? <div className="na-loading" role="status">{t("loading")}</div> : error ? <div className="na-error" role="alert">{t("safeError")}</div> : !rows.length ? <div className="na-empty">{t("empty")}</div> : <div className="na-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column} scope="col">{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? index)}>{columns.map((column) => <td key={column}>{row[column] == null ? t("unavailable") : typeof row[column] === "boolean" ? String(row[column]) : String(row[column]).slice(0, 120)}</td>)}</tr>)}</tbody></table></div>}
  </main>;
}
