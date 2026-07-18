"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import { adminCacheKey } from "@/cache/keys";
import { adminService } from "@/services/AdminService";
import { AdminActionDialog } from "@/components/admin/AdminActionDialog";

const tabs = ["overview","profile","planCredits","tenderActivity","questions","payments","feedback","legalAcceptance","trainingConsent","securityActivity","sessions","adminNotes","accountActions"];
export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>(); const { user } = useAuth(); const { activeLocale } = useLocale(); const t = useTranslations("admin");
  const key = user ? adminCacheKey(user.id, user.role, `user:${params.userId}`, "detail", null, activeLocale) : null;
  const { data, error, mutate } = useSWR<Record<string, unknown>>(key, () => adminService.user(params.userId), { revalidateOnFocus: true });
  const safeUser = (data?.user ?? {}) as Record<string, unknown>;
  return <main className="na-content"><div className="na-heading"><div><p>{params.userId}</p><h1>{t("userDetail")}</h1></div></div><div className="na-tabs" role="tablist" aria-label={t("userDetail")}>{tabs.map((tab, index) => <button role="tab" aria-selected={index === 0} key={tab}>{t(tab)}</button>)}</div>{error ? <div className="na-error">{t("safeError")}</div> : <pre className="na-safe-json">{JSON.stringify(safeUser, null, 2)}</pre>}<section className="na-actions" aria-label={t("accountActions")}><h2>{t("accountActions")}</h2>{["admin","super_admin"].includes(user?.role ?? "") ? <AdminActionDialog target={String(safeUser.email ?? params.userId)} action="Suspend account" effect="Blocks login and revokes all active sessions." confirmation="SUSPEND" onConfirm={async (reason) => { await adminService.action(`users/${params.userId}/status`, { status: "suspended", reason, confirmation: "SUSPEND" }); await mutate(); }} /> : null}<AdminActionDialog target={String(safeUser.email ?? params.userId)} action="Revoke all sessions" effect="Signs the user out on every device." confirmation="REVOKE" onConfirm={async (reason) => { await adminService.action(`users/${params.userId}/sessions/revoke`, { reason, confirmation: "REVOKE" }); await mutate(); }} /></section><aside className="na-warning">{t("noteWarning")}</aside></main>;
}
