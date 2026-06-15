"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/contexts/AuthContext";

function loginHref(pathname: string) {
  return `/login?next=${encodeURIComponent(pathname)}`;
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const currentPath = pathname || "/";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(loginHref(currentPath));
    }
  }, [currentPath, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <section className="card p-6" role="status" aria-live="polite">
        <p className="text-sm font-semibold text-gray-950">Checking your session...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Login required"
        description="Sign in to view your protected tender workspace."
        actionHref={loginHref(currentPath)}
        actionLabel="Login"
      />
    );
  }

  return <>{children}</>;
}
