import { AuthUser } from "@/domain/auth/types";

const ACCESS_TOKEN_KEY = "tendermate.access_token";
const CURRENT_USER_KEY = "tendermate.current_user";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function saveAccessToken(token: string) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken() {
  if (!hasBrowserStorage()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function removeAccessToken() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function saveCurrentUser(user: AuthUser) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function getCurrentUser() {
  if (!hasBrowserStorage()) return null;

  const rawUser = window.localStorage.getItem(CURRENT_USER_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    window.localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

export function removeCurrentUser() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(CURRENT_USER_KEY);
}

export function clearStoredAuth() {
  removeAccessToken();
  removeCurrentUser();
}
