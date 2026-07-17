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
};

export type LoginInput = {
  email: string;
  password: string;
};

export type UserPreferencesInput = {
  preferred_language?: AppLocale;
  preferred_analysis_language?: AppLocale;
};
