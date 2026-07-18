begin;

alter table public.app_users
  add column if not exists mfa_enabled boolean not null default false,
  add column if not exists password_changed_at timestamptz;

create table if not exists public.user_mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.app_users(id) on delete cascade,
  secret_ciphertext text not null,
  verified_at timestamptz,
  last_used_timestep bigint,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_mfa_factors
  add column if not exists last_used_timestep bigint,
  add column if not exists failed_attempts integer not null default 0,
  add column if not exists locked_until timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_mfa_factors_failed_attempts_check'
  ) then
    alter table public.user_mfa_factors
      add constraint user_mfa_factors_failed_attempts_check check (failed_attempts >= 0);
  end if;
end;
$$;

create table if not exists public.user_mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_mfa_recovery_user_unused
  on public.user_mfa_recovery_codes(user_id, used_at);

create unique index if not exists idx_mfa_recovery_user_hash
  on public.user_mfa_recovery_codes(user_id, code_hash);

create table if not exists public.mfa_login_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_id_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_mfa_challenge_user_active
  on public.mfa_login_challenges(user_id, expires_at desc)
  where used_at is null;

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

create unique index if not exists idx_password_reset_one_active_per_user
  on public.password_reset_tokens(user_id)
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
alter table public.mfa_login_challenges enable row level security;
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
revoke all on public.mfa_login_challenges from anon, authenticated;
revoke all on public.user_sessions from anon, authenticated;
revoke all on public.password_reset_tokens from anon, authenticated;
revoke all on public.account_security_events from anon, authenticated;
revoke all on public.security_notification_outbox from anon, authenticated;

create or replace function public.record_mfa_failure(
  target_user_id uuid,
  failure_threshold integer,
  lock_minutes integer
)
returns table(failed_attempts integer, locked_until timestamptz)
language sql
security invoker
set search_path = public
as $$
  update public.user_mfa_factors as factor
     set failed_attempts = factor.failed_attempts + 1,
         locked_until = case
           when factor.failed_attempts + 1 >= greatest(failure_threshold, 1)
             then now() + make_interval(mins => greatest(lock_minutes, 1))
           else factor.locked_until
         end,
         updated_at = now()
   where factor.user_id = target_user_id
  returning factor.failed_attempts, factor.locked_until;
$$;

revoke all on function public.record_mfa_failure(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.record_mfa_failure(uuid, integer, integer) to service_role;

create or replace function public.replace_mfa_recovery_codes(
  target_user_id uuid,
  new_code_hashes text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.user_mfa_recovery_codes where user_id = target_user_id;
  insert into public.user_mfa_recovery_codes(user_id, code_hash)
  select target_user_id, code_hash from unnest(coalesce(new_code_hashes, array[]::text[])) as code_hash;
end;
$$;

revoke all on function public.replace_mfa_recovery_codes(uuid, text[]) from public, anon, authenticated;
grant execute on function public.replace_mfa_recovery_codes(uuid, text[]) to service_role;

drop function if exists public.disable_user_mfa(uuid);

create or replace function public.disable_user_mfa(target_user_id uuid, current_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.user_mfa_recovery_codes where user_id = target_user_id;
  delete from public.user_mfa_factors where user_id = target_user_id;
  update public.app_users set mfa_enabled = false where id = target_user_id;
  update public.user_sessions
     set revoked_at = now()
   where user_id = target_user_id
     and id <> current_session_id
     and revoked_at is null;
end;
$$;

revoke all on function public.disable_user_mfa(uuid, uuid) from public, anon, authenticated;
grant execute on function public.disable_user_mfa(uuid, uuid) to service_role;

create or replace function public.change_user_password(
  target_user_id uuid,
  new_password_hash text,
  current_session_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.app_users
     set password_hash = new_password_hash,
         password_changed_at = now(),
         failed_login_count = 0,
         locked_until = null
   where id = target_user_id;
  update public.password_reset_tokens
     set used_at = coalesce(used_at, now())
   where user_id = target_user_id;
  update public.user_sessions
     set revoked_at = now()
   where user_id = target_user_id
     and id <> current_session_id
     and revoked_at is null;
end;
$$;

revoke all on function public.change_user_password(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.change_user_password(uuid, text, uuid) to service_role;

create or replace function public.complete_user_password_reset(
  target_user_id uuid,
  new_password_hash text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.app_users
     set password_hash = new_password_hash,
         password_changed_at = now(),
         failed_login_count = 0,
         locked_until = null
   where id = target_user_id;
  update public.password_reset_tokens
     set used_at = coalesce(used_at, now())
   where user_id = target_user_id;
  update public.user_sessions
     set revoked_at = now()
   where user_id = target_user_id
     and revoked_at is null;
end;
$$;

revoke all on function public.complete_user_password_reset(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_user_password_reset(uuid, text) to service_role;

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
