import { AuthSession, AuthUser, LoginInput, SignupInput } from "@/domain/auth/types";
import { apiRequest } from "@/services/api";

export function signupUser(input: SignupInput) {
  return apiRequest<AuthSession>("/auth/signup", {
    method: "POST",
    auth: false,
    body: input
  });
}

export function loginUser(input: LoginInput) {
  return apiRequest<AuthSession>("/auth/login", {
    method: "POST",
    auth: false,
    body: input
  });
}

export function fetchCurrentUser() {
  return apiRequest<AuthUser>("/auth/me");
}
