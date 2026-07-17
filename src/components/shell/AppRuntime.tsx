"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: string;
};

type RuntimeNavigator = Navigator & {
  connection?: NetworkInformation;
  deviceMemory?: number;
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function shouldPrefetch() {
  const runtimeNavigator = navigator as RuntimeNavigator;
  const connection = runtimeNavigator.connection;
  if (connection?.saveData || connection?.effectiveType === "slow-2g") return false;
  if (typeof runtimeNavigator.deviceMemory === "number" && runtimeNavigator.deviceMemory <= 2) return false;
  return true;
}

export function AppRuntime() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !shouldPrefetch()) return;
    const routes = isAuthenticated
      ? ["/dashboard", "/history", "/profile", "/billing", "/pricing"]
      : ["/login", "/signup", "/pricing"];
    const idleWindow = window as IdleWindow;
    const prefetch = () => routes.forEach((route) => router.prefetch(route));

    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(prefetch, { timeout: 2500 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(prefetch, 1200);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
      return;
    }

    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        if (registration.active?.scriptURL.endsWith("/sw.js")) void registration.unregister();
      });
    });
    if ("caches" in window) {
      void caches.keys().then((keys) => {
        keys.filter((key) => key.startsWith("tm-shell-")).forEach((key) => void caches.delete(key));
      });
    }
  }, []);

  return null;
}
