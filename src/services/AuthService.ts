import { AuthSession, AuthUser, LoginInput, LoginResponse, MfaChallengeInput, SignupInput, UserPreferencesInput } from "@/domain/auth/types";
import { apiRequest } from "@/services/api";

export function signupUser(input: SignupInput) {
  return apiRequest<AuthSession>("/auth/signup", {
    method: "POST",
    auth: false,
    body: input
  });
}

export function loginUser(input: LoginInput) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: input
  });
}

export function completeMfaLogin(input: MfaChallengeInput) {
  return apiRequest<AuthSession>("/auth/mfa/challenge", {
    method: "POST",
    auth: false,
    body: input
  });
}

export function fetchCurrentUser() {
  return apiRequest<AuthUser>("/auth/me");
}

export function updateUserPreferences(input: UserPreferencesInput) {
  return apiRequest<AuthUser>("/auth/preferences", {
    method: "PATCH",
    body: input
  });
}
