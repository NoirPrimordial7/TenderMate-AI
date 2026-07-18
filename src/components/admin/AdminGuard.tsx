"use client";

import type { ReactNode } from "react";
import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale, useTranslations } from "@/contexts/LocaleContext";
import { adminCacheKey, staffPermissionSignature } from "@/cache/keys";
import { adminService } from "@/services/AdminService";
import { isApiError } from "@/services/api";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const { activeLocale } = useLocale();
  const t = useTranslations("admin");
  const key = user ? adminCacheKey(user.id, user.role, staffPermissionSignature(user.role), "authorization", "none", null, activeLocale) : null;
  const { data, error, isLoading: authorizing } = useSWR(key, () => adminService.overview(), { keepPreviousData: false, revalidateOnFocus: true });
  if (isLoading || authorizing) return <main className="na-auth-state" role="status"><span />{t("authorizing")}</main>;
  if (!user || error || !data) return <main className="na-auth-state" role="alert"><h1>{t("denied")}</h1><p>{isApiError(error) ? error.message : t("deniedHelp")}</p></main>;
  return <>{children}</>;
}
