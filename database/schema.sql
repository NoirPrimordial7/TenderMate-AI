create extension if not exists "pgcrypto";

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'msme_user',
  is_active boolean not null default true,
  free_analysis_credits integer not null default 15,
  plan_name text not null default 'free',
  subscription_status text not null default 'trial',
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  title text not null,
  organization text,
  category text,
  location text,
  deadline text,
  risk_level text,
  fit_score integer check (fit_score is null or (fit_score >= 0 and fit_score <= 100)),
  status text not null default 'uploaded',
  analysis_json jsonb,
  original_file_name text,
  error_message text,
  extracted_text_preview text,
  page_count integer,
  extraction_method text,
  ocr_used boolean not null default false,
  ocr_confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid references public.tenders(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete cascade,
  file_name text not null,
  file_size bigint,
  mime_type text,
  storage_bucket text,
  storage_path text,
  pdf_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  event_type text not null,
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  provider text not null default 'manual',
  provider_payment_id text,
  provider_order_id text,
  amount integer,
  currency text not null default 'INR',
  status text not null default 'pending',
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tender_pages (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid references public.tenders(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete cascade,
  page_number integer not null,
  text text,
  extraction_method text not null default 'text',
  created_at timestamptz not null default now()
);

alter table public.app_users
add column if not exists free_analysis_credits integer not null default 15;

alter table public.app_users
alter column free_analysis_credits set default 15;

alter table public.app_users
add column if not exists plan_name text not null default 'free';

alter table public.app_users
add column if not exists subscription_status text not null default 'trial';

alter table public.app_users
add column if not exists failed_login_count integer not null default 0;

alter table public.app_users
add column if not exists locked_until timestamptz;

alter table public.app_users
add column if not exists last_login_at timestamptz;

alter table public.tenders
add column if not exists user_id uuid references public.app_users(id) on delete cascade;

alter table public.tenders
add column if not exists status text not null default 'uploaded';

alter table public.tenders
add column if not exists analysis_json jsonb;

alter table public.tenders
add column if not exists original_file_name text;

alter table public.tenders
add column if not exists error_message text;

alter table public.tenders
add column if not exists extracted_text_preview text;

alter table public.tenders
add column if not exists page_count integer;

alter table public.tenders
add column if not exists extraction_method text;

alter table public.tenders
add column if not exists ocr_used boolean not null default false;

alter table public.tenders
add column if not exists ocr_confidence numeric;

alter table public.tender_pages
add column if not exists extraction_method text not null default 'text';

alter table public.uploads
add column if not exists user_id uuid references public.app_users(id) on delete cascade;

alter table public.uploads
add column if not exists tender_id uuid references public.tenders(id) on delete cascade;

alter table public.uploads
add column if not exists file_name text;

alter table public.uploads
add column if not exists file_size bigint;

alter table public.uploads
add column if not exists mime_type text;

alter table public.uploads
add column if not exists storage_bucket text;

alter table public.uploads
add column if not exists storage_path text;

alter table public.uploads
add column if not exists pdf_url text;

alter table public.uploads
add column if not exists created_at timestamptz not null default now();

create index if not exists idx_app_users_email on public.app_users (email);
create index if not exists idx_tenders_created_at on public.tenders (created_at desc);
create index if not exists idx_tenders_user_id on public.tenders (user_id);
create index if not exists idx_tenders_user_created_at on public.tenders (user_id, created_at desc);
create index if not exists idx_tenders_status on public.tenders (status);
create index if not exists idx_tenders_category on public.tenders (category);
create index if not exists idx_tenders_deadline on public.tenders (deadline);
create index if not exists idx_tenders_analysis_json on public.tenders using gin (analysis_json);
create index if not exists idx_uploads_tender_id on public.uploads (tender_id);
create index if not exists idx_uploads_user_id on public.uploads (user_id);
create index if not exists idx_uploads_created_at on public.uploads (created_at desc);
create index if not exists idx_usage_events_user_id on public.user_usage_events (user_id);
create index if not exists idx_usage_events_type_created_at on public.user_usage_events (event_type, created_at desc);
create index if not exists idx_usage_events_user_type_created_at on public.user_usage_events (user_id, event_type, created_at desc);
create index if not exists idx_payments_user_id on public.payments (user_id);
create index if not exists idx_payments_status_created_at on public.payments (status, created_at desc);
create index if not exists idx_audit_logs_user_id on public.audit_logs (user_id);
create index if not exists idx_audit_logs_action_created_at on public.audit_logs (action, created_at desc);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_tender_pages_tender_id on public.tender_pages (tender_id);
create index if not exists idx_tender_pages_user_id on public.tender_pages (user_id);
create unique index if not exists idx_tender_pages_tender_page on public.tender_pages (tender_id, page_number);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_app_users_updated_at on public.app_users;
create trigger set_app_users_updated_at
before update on public.app_users
for each row
execute function public.set_updated_at();

drop trigger if exists set_tenders_updated_at on public.tenders;
create trigger set_tenders_updated_at
before update on public.tenders
for each row
execute function public.set_updated_at();
