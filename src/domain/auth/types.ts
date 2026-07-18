import type { AppLocale } from "@/i18n/config";

export type AuthUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  free_analysis_credits: number;
  plan_name: string;
  subscription_status: string;
  preferred_language: AppLocale;
  preferred_analysis_language: AppLocale;
  mfa_enabled: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
};

export type AuthSession = {
  access_token: string;
  token_type: "bearer" | string;
  user: AuthUser;
};

export type SignupInput = {
  full_name: string;
  email: string;
  password: string;
  preferred_language?: AppLocale;
  preferred_analysis_language?: AppLocale;
  accepted_legal: boolean;
  legal_locale: AppLocale;
  turnstile_token?: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
  turnstile_token?: string | null;
};

export type LoginResponse = Partial<AuthSession> & {
  mfa_required: boolean;
  challenge_token?: string | null;
};

export type MfaChallengeInput = {
  challenge_token: string;
  code?: string;
  recovery_code?: string;
};

export type UserPreferencesInput = {
  preferred_language?: AppLocale;
  preferred_analysis_language?: AppLocale;
};
