export type SecurityStatus = {
  mfa_enabled: boolean;
  mfa_required: boolean;
  recovery_codes_remaining: number;
  recent_login_valid: boolean;
};

export type AccountSession = {
  id: string;
  device: string;
  ip_hint: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  current: boolean;
};

export type SecurityEvent = {
  id: string;
  event_type: string;
  success: boolean;
  device: string | null;
  ip_hint: string | null;
  created_at: string;
};

export type MfaSetup = { secret: string; otpauth_uri: string };
export type RecoveryCodes = { recovery_codes: string[] };
