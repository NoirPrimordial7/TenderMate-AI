"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";

function loginHref(pathname: string) {
  return `/login?next=${encodeURIComponent(pathname)}`;
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const currentPath = pathname || "/";

  if (isLoading) {
    return (
      <section className="card p-6" role="status" aria-live="polite">
        <p className="text-sm font-semibold text-gray-950">Checking your session...</p>
        <p className="mt-1 text-sm text-gray-600">Loading your protected TenderMate workspace.</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Login required"
        description="Sign in again to view your protected tender workspace. If your token expired, your local session has been cleared."
        actionHref={loginHref(currentPath)}
        actionLabel="Login"
      />
    );
  }

  return <>{children}</>;
}
