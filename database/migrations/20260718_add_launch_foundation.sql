begin;

alter table public.app_users
  add column if not exists training_consent boolean not null default false;

create table if not exists public.user_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  document_type text not null,
  document_version text not null,
  locale text not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_legal_acceptances_type_check check (document_type in ('terms','privacy','ai_disclaimer')),
  constraint user_legal_acceptances_locale_check check (locale in ('en','hi','mr')),
  constraint user_legal_acceptances_unique unique (user_id, document_type, document_version)
);

create index if not exists idx_user_legal_acceptances_user_created
  on public.user_legal_acceptances (user_id, created_at desc);

alter table public.user_legal_acceptances enable row level security;
drop policy if exists "Users can read own legal acceptances" on public.user_legal_acceptances;
create policy "Users can read own legal acceptances"
on public.user_legal_acceptances for select
using (auth.uid() = user_id);

create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.app_users(id) on delete set null,
  tender_id uuid null references public.tenders(id) on delete set null,
  category text not null,
  message text not null,
  email text null,
  locale text not null,
  page_path text not null,
  performance_mode text not null,
  viewport_class text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint product_feedback_category_check check (category in ('incorrect','accuracy','missing','design','feature','pricing','performance','technical','other')),
  constraint product_feedback_locale_check check (locale in ('en','hi','mr')),
  constraint product_feedback_performance_check check (performance_mode in ('full','low')),
  constraint product_feedback_viewport_check check (viewport_class in ('mobile','tablet','laptop','desktop')),
  constraint product_feedback_status_check check (status in ('new','reviewing','planned','implemented','rejected')),
  constraint product_feedback_message_length check (char_length(message) between 10 and 2000),
  constraint product_feedback_path_length check (char_length(page_path) between 1 and 300)
);

create index if not exists idx_product_feedback_user_created on public.product_feedback (user_id, created_at desc);
create index if not exists idx_product_feedback_status_created on public.product_feedback (status, created_at desc);

alter table public.product_feedback enable row level security;
drop policy if exists "Users can read own product feedback" on public.product_feedback;
create policy "Users can read own product feedback"
on public.product_feedback for select
using (auth.uid() = user_id);

comment on table public.product_feedback is
  'Privacy-limited product feedback. Anonymous inserts are backend-only through the service role.';

commit;
