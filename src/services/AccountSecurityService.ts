import type { AccountSession, MfaSetup, RecoveryCodes, SecurityEvent, SecurityStatus } from "@/domain/auth/security";
import { apiRequest } from "@/services/api";

export const accountSecurityService = {
  getStatus: () => apiRequest<SecurityStatus>("/auth/security/status"),
  getSessions: () => apiRequest<AccountSession[]>("/auth/security/sessions"),
  getActivity: () => apiRequest<SecurityEvent[]>("/auth/security/activity"),
  verifyRecent: (password: string, code?: string) => apiRequest<void>("/auth/security/verify-recent", { method: "POST", body: { password, code: code || null } }),
  startMfa: () => apiRequest<MfaSetup>("/auth/security/mfa/setup", { method: "POST" }),
  confirmMfa: (code: string) => apiRequest<RecoveryCodes>("/auth/security/mfa/confirm", { method: "POST", body: { code } }),
  disableMfa: () => apiRequest<void>("/auth/security/mfa", { method: "DELETE" }),
  regenerateRecoveryCodes: () => apiRequest<RecoveryCodes>("/auth/security/mfa/recovery-codes", { method: "POST" }),
  revokeSession: (id: string) => apiRequest<void>(`/auth/security/sessions/by-id/${id}`, { method: "DELETE" }),
  revokeCurrentSession: () => apiRequest<void>("/auth/security/sessions/revoke-current", { method: "POST", invalidateAuthOn401: false }),
  revokeOtherSessions: () => apiRequest<void>("/auth/security/sessions/revoke-others", { method: "POST" }),
  revokeAllSessions: () => apiRequest<void>("/auth/security/sessions/revoke-all", { method: "POST" }),
  changePassword: (currentPassword: string, newPassword: string, mfaCode?: string) => apiRequest<void>("/auth/security/password/change", { method: "POST", body: { current_password: currentPassword, new_password: newPassword, mfa_code: mfaCode || null } }),
  requestPasswordReset: (email: string, turnstileToken?: string | null) => apiRequest<{ accepted: true }>("/auth/password-reset/request", { method: "POST", auth: false, body: { email, turnstile_token: turnstileToken || null } }),
  confirmPasswordReset: (token: string, newPassword: string) => apiRequest<{ accepted: true }>("/auth/password-reset/confirm", { method: "POST", auth: false, body: { token, new_password: newPassword } })
};
