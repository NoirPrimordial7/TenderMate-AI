"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";
import { AuthSession, AuthUser, LoginInput, SignupInput, UserPreferencesInput } from "@/domain/auth/types";
import { AUTH_INVALIDATED_EVENT, clearConditionalApiCache, isApiError } from "@/services/api";
import { fetchCurrentUser, loginUser, signupUser, updateUserPreferences } from "@/services/AuthService";
import {
  clearStoredAuth,
  getAccessToken,
  getCurrentUser,
  saveAccessToken,
  saveCurrentUser
} from "@/services/authStorage";
import { useLocale } from "@/contexts/LocaleContext";
import { cacheKeys } from "@/cache/keys";
import { clearPersistentPrivateCache } from "@/cache/persistent";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signup(input: SignupInput): Promise<void>;
  login(input: LoginInput): Promise<void>;
  logout(redirectTo?: string): void;
  refreshUser(): Promise<AuthUser | null>;
  updateLanguagePreferences(input: UserPreferencesInput): Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readNextRedirect(redirectTo?: string) {
  return redirectTo ?? "/login";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { mutate: mutateCache } = useSWRConfig();
  const { activeLocale, analysisLocale, setAnalysisLocale, setLocale } = useLocale();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const sessionKey = hasInitialized && token ? (user ? cacheKeys.auth(user.id) : ["private", "pending-session", "me"] as const) : null;
  const { data: revalidatedUser, error: revalidationError, isLoading: isRevalidating } = useSWR(
    sessionKey,
    fetchCurrentUser,
    {
      fallbackData: user ?? undefined,
      keepPreviousData: false,
      revalidateOnFocus: true
    }
  );

  const clearSession = useCallback(() => {
    if (user?.id) clearPersistentPrivateCache(user.id);
    if (user?.id) clearConditionalApiCache(`${user.id}:`);
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, [user?.id]);

  const applySession = useCallback((session: AuthSession) => {
    if (user?.id && user.id !== session.user.id) {
      clearPersistentPrivateCache(user.id);
      clearConditionalApiCache(`${user.id}:`);
      void mutateCache((key) => Array.isArray(key) && key[0] === "private" && key[1] === user.id, undefined, { revalidate: false });
    }
    saveAccessToken(session.access_token);
    saveCurrentUser(session.user);
    setToken(session.access_token);
    setUser(session.user);
  }, [mutateCache, user?.id]);

  const refreshUser = useCallback(async () => {
    const storedToken = getAccessToken();
    if (!storedToken) {
      clearSession();
      return null;
    }

    setToken(storedToken);

    try {
      const currentUser = await fetchCurrentUser();
      saveCurrentUser(currentUser);
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        clearSession();
        return null;
      }

      return getCurrentUser();
    }
  }, [clearSession]);

  const updateLanguagePreferences = useCallback(async (input: UserPreferencesInput) => {
    if (!token || !user) return null;
    const optimisticUser = { ...user, ...input };
    setUser(optimisticUser);
    saveCurrentUser(optimisticUser);

    try {
      const updatedUser = await updateUserPreferences(input);
      setUser(updatedUser);
      saveCurrentUser(updatedUser);
      await mutateCache(sessionKey, updatedUser, { revalidate: false });
      return updatedUser;
    } catch {
      setUser(user);
      saveCurrentUser(user);
      await mutateCache(sessionKey, user, { revalidate: false });
      return null;
    }
  }, [mutateCache, sessionKey, token, user]);

  const signup = useCallback(
    async (input: SignupInput) => {
      const session = await signupUser(input);
      applySession(session);
    },
    [applySession]
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await loginUser(input);
      applySession(session);
    },
    [applySession]
  );

  const logout = useCallback(
    (redirectTo?: string) => {
      clearSession();
      void mutateCache(
        (key) => Array.isArray(key) && key[0] === "private",
        undefined,
        { revalidate: false }
      );
      router.push(readNextRedirect(redirectTo));
    },
    [clearSession, mutateCache, router]
  );

  useEffect(() => {
    const storedToken = getAccessToken();
    const storedUser = getCurrentUser();

    if (!storedToken) {
      setHasInitialized(true);
      return;
    }

    setToken(storedToken);
    setUser(storedUser);

    setHasInitialized(true);
  }, []);

  useEffect(() => {
    if (!revalidatedUser) return;
    setUser(revalidatedUser);
    saveCurrentUser(revalidatedUser);
  }, [revalidatedUser]);

  useEffect(() => {
    if (!revalidationError || !isApiError(revalidationError) || revalidationError.status !== 401) return;
    clearSession();
  }, [clearSession, revalidationError]);

  useEffect(() => {
    if (!user) return;
    if (user.preferred_language && user.preferred_language !== activeLocale) {
      setLocale(user.preferred_language);
    }
    if (user.preferred_analysis_language && user.preferred_analysis_language !== analysisLocale) {
      setAnalysisLocale(user.preferred_analysis_language);
    }
  }, [activeLocale, analysisLocale, setAnalysisLocale, setLocale, user]);

  useEffect(() => {
    const handleAuthInvalidated = () => {
      clearSession();
      void mutateCache(
        (key) => Array.isArray(key) && key[0] === "private",
        undefined,
        { revalidate: false }
      );
    };

    window.addEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
    return () => window.removeEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
  }, [clearSession, mutateCache]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading: !hasInitialized || Boolean(token && !user && isRevalidating),
      signup,
      login,
      logout,
      refreshUser,
      updateLanguagePreferences
    }),
    [hasInitialized, isRevalidating, login, logout, refreshUser, signup, token, updateLanguagePreferences, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
