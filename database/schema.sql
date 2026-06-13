create extension if not exists "pgcrypto";

create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text,
  category text,
  location text,
  deadline text,
  risk_level text,
  fit_score integer check (fit_score is null or (fit_score >= 0 and fit_score <= 100)),
  status text not null default 'uploaded',
  analysis_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid references public.tenders(id) on delete cascade,
  file_name text not null,
  file_size bigint,
  mime_type text,
  storage_bucket text,
  storage_path text,
  pdf_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenders_created_at on public.tenders (created_at desc);
create index if not exists idx_tenders_status on public.tenders (status);
create index if not exists idx_tenders_category on public.tenders (category);
create index if not exists idx_tenders_deadline on public.tenders (deadline);
create index if not exists idx_tenders_analysis_json on public.tenders using gin (analysis_json);
create index if not exists idx_uploads_tender_id on public.uploads (tender_id);
create index if not exists idx_uploads_created_at on public.uploads (created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_tenders_updated_at on public.tenders;
create trigger set_tenders_updated_at
before update on public.tenders
for each row
execute function public.set_updated_at();
