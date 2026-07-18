begin;

create extension if not exists "pgcrypto";

alter table public.app_users add column if not exists email_verified_at timestamptz;
alter table public.app_users add column if not exists mfa_enabled boolean not null default false;
alter table public.app_users add column if not exists account_status text not null default 'active';
alter table public.app_users add column if not exists question_credits integer not null default 0;
alter table public.app_users add column if not exists password_reset_required boolean not null default false;
alter table public.app_users add column if not exists last_active_at timestamptz;

do $$ begin
  alter table public.app_users add constraint app_users_account_status_check
    check (account_status in ('active','suspended','restricted','pending_deletion','deleted','anonymized'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.app_users add constraint app_users_question_credits_check check (question_credits >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.app_users add constraint app_users_role_check
    check (role in ('msme_user','super_admin','admin','support','finance','reviewer'));
exception when duplicate_object then null; end $$;

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  mfa_assured_at timestamptz,
  authenticated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  constraint app_sessions_token_hash_length check (char_length(token_hash) between 32 and 256),
  constraint app_sessions_expiry_check check (expires_at > created_at)
);

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.app_users(id) on delete set null,
  actor_role text not null,
  action text not null,
  target_type text not null,
  target_id text,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint admin_audit_actor_role_check check (actor_role in ('super_admin','admin','support','finance','reviewer','system')),
  constraint admin_audit_reason_length check (char_length(reason) between 3 and 1000),
  constraint admin_audit_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  author_staff_id uuid not null references public.app_users(id) on delete restrict,
  category text not null,
  note text not null,
  created_at timestamptz not null default now(),
  constraint admin_notes_category_length check (char_length(category) between 2 and 60),
  constraint admin_notes_note_length check (char_length(note) between 3 and 2000)
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete restrict,
  credit_type text not null,
  amount integer not null,
  reason_category text not null,
  internal_note text not null,
  actor_user_id uuid not null references public.app_users(id) on delete restrict,
  idempotency_key uuid not null unique,
  related_tender_id uuid references public.tenders(id) on delete set null,
  related_payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint credit_ledger_type_check check (credit_type in ('analysis','question')),
  constraint credit_ledger_amount_check check (amount <> 0),
  constraint credit_ledger_reason_length check (char_length(reason_category) between 2 and 80),
  constraint credit_ledger_note_length check (char_length(internal_note) between 3 and 1000)
);

create table if not exists public.tender_support_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  tender_id uuid references public.tenders(id) on delete cascade,
  granted_to_staff_id uuid not null references public.app_users(id) on delete cascade,
  purpose text not null,
  granted_by uuid not null references public.app_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  break_glass boolean not null default false,
  constraint tender_support_access_expiry check (expires_at > created_at),
  constraint tender_support_access_purpose check (char_length(purpose) between 10 and 1000)
);

alter table public.product_feedback add column if not exists assigned_staff_id uuid references public.app_users(id) on delete set null;
alter table public.product_feedback add column if not exists internal_notes text;

create index if not exists idx_app_users_admin_directory on public.app_users (role, account_status, created_at desc, id desc);
create index if not exists idx_app_users_last_active on public.app_users (last_active_at desc);
create index if not exists idx_app_sessions_user_active on public.app_sessions (user_id, revoked_at, expires_at desc);
create index if not exists idx_admin_audit_actor_time on public.admin_audit_events (actor_user_id, created_at desc);
create index if not exists idx_admin_audit_target_time on public.admin_audit_events (target_type, target_id, created_at desc);
create index if not exists idx_admin_audit_action_time on public.admin_audit_events (action, created_at desc);
create index if not exists idx_admin_notes_user_time on public.admin_notes (user_id, created_at desc);
create index if not exists idx_credit_ledger_user_time on public.credit_ledger (user_id, created_at desc);
create index if not exists idx_support_grants_staff_expiry on public.tender_support_access_grants (granted_to_staff_id, expires_at desc) where revoked_at is null;

create or replace function public.reject_append_only_mutation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin raise exception 'append-only table'; end; $$;

drop trigger if exists admin_audit_events_append_only on public.admin_audit_events;
create trigger admin_audit_events_append_only before update or delete on public.admin_audit_events
for each row execute function public.reject_append_only_mutation();
drop trigger if exists credit_ledger_append_only on public.credit_ledger;
create trigger credit_ledger_append_only before update or delete on public.credit_ledger
for each row execute function public.reject_append_only_mutation();

create or replace function public.admin_adjust_credit(
  p_user_id uuid, p_credit_type text, p_amount integer, p_reason_category text,
  p_internal_note text, p_actor_user_id uuid, p_idempotency_key uuid
) returns table (ledger_id uuid, balance integer)
language plpgsql security invoker set search_path = '' as $$
declare current_balance integer; new_balance integer; created_id uuid;
begin
  if p_amount = 0 or p_credit_type not in ('analysis','question') then raise exception 'invalid credit adjustment'; end if;
  if exists (select 1 from public.credit_ledger where idempotency_key = p_idempotency_key) then raise exception 'duplicate credit adjustment'; end if;
  select case when p_credit_type = 'analysis' then free_analysis_credits else question_credits end
    into current_balance from public.app_users where id = p_user_id for update;
  if current_balance is null then raise exception 'user not found'; end if;
  new_balance := current_balance + p_amount;
  if new_balance < 0 then raise exception 'credit balance cannot be negative'; end if;
  insert into public.credit_ledger(user_id,credit_type,amount,reason_category,internal_note,actor_user_id,idempotency_key)
    values(p_user_id,p_credit_type,p_amount,p_reason_category,p_internal_note,p_actor_user_id,p_idempotency_key) returning id into created_id;
  if p_credit_type = 'analysis' then update public.app_users set free_analysis_credits = new_balance where id = p_user_id;
  else update public.app_users set question_credits = new_balance where id = p_user_id; end if;
  return query select created_id, new_balance;
end; $$;

create or replace function public.admin_console_overview()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'total_users', (select count(*) from public.app_users),
    'verified_users', (select count(*) from public.app_users where email_verified_at is not null),
    'mfa_enabled_users', (select count(*) from public.app_users where mfa_enabled),
    'active_users_1d', (select count(*) from public.app_users where last_active_at >= now() - interval '1 day'),
    'active_users_7d', (select count(*) from public.app_users where last_active_at >= now() - interval '7 days'),
    'active_users_30d', (select count(*) from public.app_users where last_active_at >= now() - interval '30 days'),
    'new_users_1d', (select count(*) from public.app_users where created_at >= now() - interval '1 day'),
    'new_users_7d', (select count(*) from public.app_users where created_at >= now() - interval '7 days'),
    'new_users_30d', (select count(*) from public.app_users where created_at >= now() - interval '30 days'),
    'suspended_users', (select count(*) from public.app_users where account_status = 'suspended'),
    'trial_users', (select count(*) from public.app_users where subscription_status = 'trial'),
    'paid_users', null,
    'tenders_uploaded', (select count(*) from public.tenders),
    'successful_analyses', (select count(*) from public.ai_model_runs where task = 'tender_analysis' and status = 'success'),
    'failed_analyses', (select count(*) from public.ai_model_runs where task = 'tender_analysis' and status in ('invalid','error')),
    'questions_asked', (select count(*) from public.tender_chat_messages where role = 'user'),
    'feedback_new', (select count(*) from public.product_feedback where status = 'new'),
    'feedback_reviewing', (select count(*) from public.product_feedback where status = 'reviewing'),
    'feedback_planned', (select count(*) from public.product_feedback where status = 'planned'),
    'feedback_implemented', (select count(*) from public.product_feedback where status = 'implemented'),
    'feedback_rejected', (select count(*) from public.product_feedback where status = 'rejected'),
    'security_alerts', (select count(*) from public.audit_logs where action in ('login_failed','account_locked')),
    'ai_provider_success_rate', (select round(100.0 * count(*) filter (where status = 'success') / nullif(count(*), 0), 2) from public.ai_model_runs),
    'average_analysis_latency_ms', (select round(avg(latency_ms), 2) from public.ai_model_runs where task = 'tender_analysis' and latency_ms is not null),
    'model_validation_failure_rate', (select round(100.0 * count(*) filter (where not validation_passed) / nullif(count(*), 0), 2) from public.ai_model_runs),
    'notification_outbox_backlog', null,
    'payments', null,
    'refunds', null
  );
$$;

alter table public.app_sessions enable row level security;
alter table public.admin_audit_events enable row level security;
alter table public.admin_notes enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.tender_support_access_grants enable row level security;

revoke all on table public.app_sessions, public.admin_audit_events, public.admin_notes,
  public.credit_ledger, public.tender_support_access_grants from anon, authenticated;
revoke all on function public.admin_adjust_credit(uuid,text,integer,text,text,uuid,uuid) from public, anon, authenticated;
revoke all on function public.admin_console_overview() from public, anon, authenticated;
revoke all on function public.reject_append_only_mutation() from public, anon, authenticated;

comment on table public.admin_audit_events is 'Append-only safe staff audit metadata; never store secrets or document bodies.';
comment on table public.admin_notes is 'Private staff notes; service-role API access only.';
comment on table public.tender_support_access_grants is 'Temporary, revocable, audited metadata access grants; no signed URLs.';

commit;
