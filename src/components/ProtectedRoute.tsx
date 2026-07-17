"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "@/contexts/LocaleContext";

function loginHref(pathname: string) {
  return `/login?next=${encodeURIComponent(pathname)}`;
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const processing = useTranslations("processing");
  const errors = useTranslations("errors");
  const navigation = useTranslations("navigation");
  const currentPath = pathname || "/";

  if (isLoading) {
    return (
      <section className="card p-6" role="status" aria-live="polite">
        <p className="text-sm font-semibold text-gray-950">{processing("session")}</p>
        <p className="mt-1 text-sm text-gray-600">{processing("protectedLoading")}</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title={errors("loginRequired")}
        description={errors("loginRequiredDescription")}
        actionHref={loginHref(currentPath)}
        actionLabel={navigation("signIn")}
      />
    );
  }

  return <>{children}</>;
}
