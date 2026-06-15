"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSession, AuthUser, LoginInput, SignupInput } from "@/domain/auth/types";
import { AUTH_INVALIDATED_EVENT, isApiError } from "@/services/api";
import { fetchCurrentUser, loginUser, signupUser } from "@/services/AuthService";
import {
  clearStoredAuth,
  getAccessToken,
  getCurrentUser,
  saveAccessToken,
  saveCurrentUser
} from "@/services/authStorage";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signup(input: SignupInput): Promise<void>;
  login(input: LoginInput): Promise<void>;
  logout(redirectTo?: string): void;
  refreshUser(): Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readNextRedirect(redirectTo?: string) {
  return redirectTo ?? "/login";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const applySession = useCallback((session: AuthSession) => {
    saveAccessToken(session.access_token);
    saveCurrentUser(session.user);
    setToken(session.access_token);
    setUser(session.user);
  }, []);

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
      router.push(readNextRedirect(redirectTo));
    },
    [clearSession, router]
  );

  useEffect(() => {
    const storedToken = getAccessToken();
    const storedUser = getCurrentUser();

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    setUser(storedUser);

    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    const handleAuthInvalidated = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
    return () => window.removeEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isLoading,
      signup,
      login,
      logout,
      refreshUser
    }),
    [isLoading, login, logout, refreshUser, signup, token, user]
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
