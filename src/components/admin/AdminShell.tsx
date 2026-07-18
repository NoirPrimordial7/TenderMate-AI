"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/contexts/LocaleContext";
import { NividaIQMark } from "@/components/brand/NividaIQMark";
import { BRAND } from "@/config/brand";

const routes = ["", "users", "tenders", "analyses", "feedback", "security", "system", "audit"] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslations("admin");
  return <div className="na-console">
    <aside className="na-sidebar"><Link className="na-brand" href="/admin"><NividaIQMark/><span><strong>{BRAND.name}</strong><small>{t("console")}</small></span></Link><nav aria-label={t("navigation")}>{routes.map((route) => { const href = `/admin${route ? `/${route}` : ""}`; return <Link aria-current={pathname === href ? "page" : undefined} href={href} key={route || "overview"}>{t(route || "overview")}</Link>; })}</nav></aside>
    <div className="na-main"><header className="na-topbar"><div><ShieldCheck aria-hidden="true"/><strong>{t("mfaProtected")}</strong></div><dl><div><dt>{t("role")}</dt><dd>{user?.role.replaceAll("_", " ")}</dd></div><div><dt>{t("environment")}</dt><dd>{process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV}</dd></div></dl></header>{children}</div>
  </div>;
}
