export type AuthUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
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
};

export type LoginInput = {
  email: string;
  password: string;
};
