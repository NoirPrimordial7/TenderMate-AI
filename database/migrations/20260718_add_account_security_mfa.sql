begin;

alter table public.app_users
  add column if not exists mfa_enabled boolean not null default false,
  add column if not exists password_changed_at timestamptz;

create table if not exists public.user_mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  secret_ciphertext text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_mfa_recovery_user_unused
  on public.user_mfa_recovery_codes(user_id, used_at);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  device text not null,
  user_agent text,
  ip_hash text,
  ip_hint text,
  mfa_verified boolean not null default false,
  recent_auth_at timestamptz,
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_sessions_active
  on public.user_sessions(user_id, expires_at desc)
  where revoked_at is null;

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_active
  on public.password_reset_tokens(user_id, expires_at desc)
  where used_at is null;

create table if not exists public.account_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  event_type text not null,
  success boolean not null,
  device text,
  ip_hint text,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_events_user_created
  on public.account_security_events(user_id, created_at desc);

create table if not exists public.security_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  recipient_email text not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_outbox_pending
  on public.security_notification_outbox(created_at)
  where sent_at is null and failed_at is null;

alter table public.user_mfa_factors enable row level security;
alter table public.user_mfa_recovery_codes enable row level security;
alter table public.user_sessions enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.account_security_events enable row level security;
alter table public.security_notification_outbox enable row level security;

drop policy if exists user_sessions_select_own on public.user_sessions;
create policy user_sessions_select_own on public.user_sessions
  for select using (auth.uid() = user_id);

drop policy if exists security_events_select_own on public.account_security_events;
create policy security_events_select_own on public.account_security_events
  for select using (auth.uid() = user_id);

revoke all on public.user_mfa_factors from anon, authenticated;
revoke all on public.user_mfa_recovery_codes from anon, authenticated;
revoke all on public.password_reset_tokens from anon, authenticated;
revoke all on public.security_notification_outbox from anon, authenticated;
revoke insert, update, delete on public.user_sessions from anon, authenticated;
revoke insert, update, delete on public.account_security_events from anon, authenticated;

create or replace function public.enforce_privileged_user_mfa()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if lower(coalesce(new.role, '')) in ('staff', 'admin', 'super_admin')
     and new.mfa_enabled is not true then
    raise exception 'MFA must be enabled before assigning a privileged role';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_privileged_user_mfa on public.app_users;
create trigger trg_enforce_privileged_user_mfa
before insert or update of role, mfa_enabled on public.app_users
for each row execute function public.enforce_privileged_user_mfa();

commit;
