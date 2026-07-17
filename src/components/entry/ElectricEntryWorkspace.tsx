"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthMode } from "@/components/entry/AuthDock";
import { HeroStage } from "@/components/entry/HeroStage";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";

function safeInternalPath(value: string | null) {
  if (
    !value ||
    value.trim() !== value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) return null;
  return value;
}

type ElectricEntryWorkspaceProps = {
  initialAuthMode?: AuthMode;
  defaultAuthRedirect?: string | null;
};

export function ElectricEntryWorkspace({
  initialAuthMode = "signin",
  defaultAuthRedirect = null
}: ElectricEntryWorkspaceProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [authRedirect, setAuthRedirect] = useState<string | null>(defaultAuthRedirect);
  const [isRedirectReady, setIsRedirectReady] = useState(defaultAuthRedirect === null);

  useEffect(() => {
    const nextPath = safeInternalPath(new URLSearchParams(window.location.search).get("next"));
    setAuthRedirect(nextPath ?? defaultAuthRedirect);
    setIsRedirectReady(true);
  }, [defaultAuthRedirect]);

  useEffect(() => {
    if (isRedirectReady && !isLoading && isAuthenticated && authRedirect) {
      router.replace(authRedirect);
    }
  }, [authRedirect, isAuthenticated, isLoading, isRedirectReady, router]);

  const onAuthenticated = () => {
    if (authRedirect) router.replace(authRedirect);
  };

  return (
    <div className="te-page-shell">
      <Header />
      <HeroStage
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        user={user}
        initialAuthMode={initialAuthMode}
        openAuthOnLoad={defaultAuthRedirect !== null}
        onAuthenticated={onAuthenticated}
      />
    </div>
  );
}
