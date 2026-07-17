create extension if not exists "pgcrypto";

create table if not exists public.ai_model_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  task text not null,
  provider text not null,
  model_name text not null,
  prompt_version text not null,
  schema_version text not null,
  input_hash text not null,
  status text not null,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  validation_passed boolean not null default false,
  is_shadow boolean not null default false,
  error_category text,
  created_at timestamptz not null default now(),
  constraint ai_model_runs_task_check
    check (task in ('tender_analysis', 'answer_question')),
  constraint ai_model_runs_status_check
    check (status in ('success', 'invalid', 'error')),
  constraint ai_model_runs_input_hash_check
    check (input_hash ~ '^[0-9a-f]{64}$'),
  constraint ai_model_runs_latency_check
    check (latency_ms is null or latency_ms >= 0),
  constraint ai_model_runs_input_tokens_check
    check (input_tokens is null or input_tokens >= 0),
  constraint ai_model_runs_output_tokens_check
    check (output_tokens is null or output_tokens >= 0),
  constraint ai_model_runs_error_category_check
    check (
      error_category is null or error_category in (
        'not_configured', 'timeout', 'unavailable', 'invalid_output',
        'schema_validation', 'rate_limited', 'unknown'
      )
    )
);

create table if not exists public.ai_training_examples (
  id uuid primary key default gen_random_uuid(),
  source_run_id uuid references public.ai_model_runs(id) on delete set null,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  task text not null,
  language text not null default 'en',
  input_json jsonb not null,
  expected_output_json jsonb,
  model_output_json jsonb,
  review_status text not null default 'pending',
  review_notes text,
  quality_score integer,
  is_anonymized boolean not null default false,
  training_consent boolean not null default false,
  dataset_split text not null default 'unassigned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_training_examples_task_check
    check (task in ('tender_analysis', 'answer_question')),
  constraint ai_training_examples_language_check
    check (language in ('en', 'hi', 'mr')),
  constraint ai_training_examples_review_status_check
    check (review_status in ('pending', 'in_review', 'approved', 'rejected')),
  constraint ai_training_examples_quality_score_check
    check (quality_score is null or quality_score between 0 and 100),
  constraint ai_training_examples_dataset_split_check
    check (dataset_split in ('unassigned', 'train', 'validation', 'test', 'holdout')),
  constraint ai_training_examples_approved_privacy_check
    check (
      review_status <> 'approved'
      or (training_consent and is_anonymized and expected_output_json is not null)
    )
);

create table if not exists public.ai_output_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  model_run_id uuid references public.ai_model_runs(id) on delete set null,
  field_path text not null,
  feedback_type text not null,
  original_value jsonb,
  corrected_value jsonb,
  source_page integer,
  source_quote text,
  created_at timestamptz not null default now(),
  constraint ai_output_feedback_field_path_check
    check (char_length(field_path) between 1 and 500),
  constraint ai_output_feedback_type_check
    check (
      feedback_type in (
        'correct', 'incorrect', 'missing', 'wrong_source', 'unclear', 'hallucinated'
      )
    ),
  constraint ai_output_feedback_source_page_check
    check (source_page is null or source_page >= 1),
  constraint ai_output_feedback_source_quote_check
    check (source_quote is null or char_length(source_quote) <= 4000)
);

create index if not exists idx_ai_model_runs_user_created_at
  on public.ai_model_runs (user_id, created_at desc);
create index if not exists idx_ai_model_runs_tender_created_at
  on public.ai_model_runs (tender_id, created_at desc);
create index if not exists idx_ai_model_runs_provider_task_created_at
  on public.ai_model_runs (provider, task, created_at desc);
create index if not exists idx_ai_model_runs_shadow_created_at
  on public.ai_model_runs (is_shadow, created_at desc);
create index if not exists idx_ai_model_runs_input_hash
  on public.ai_model_runs (input_hash);

create index if not exists idx_ai_training_examples_source_run
  on public.ai_training_examples (source_run_id);
create index if not exists idx_ai_training_examples_tender
  on public.ai_training_examples (tender_id);
create index if not exists idx_ai_training_examples_review_split
  on public.ai_training_examples (review_status, dataset_split, created_at desc);
create index if not exists idx_ai_training_examples_consent_review
  on public.ai_training_examples (training_consent, is_anonymized, review_status);

create index if not exists idx_ai_output_feedback_user_created_at
  on public.ai_output_feedback (user_id, created_at desc);
create index if not exists idx_ai_output_feedback_tender_created_at
  on public.ai_output_feedback (tender_id, created_at desc);
create index if not exists idx_ai_output_feedback_model_run
  on public.ai_output_feedback (model_run_id);
create index if not exists idx_ai_output_feedback_type_created_at
  on public.ai_output_feedback (feedback_type, created_at desc);

drop trigger if exists set_ai_training_examples_updated_at
  on public.ai_training_examples;
create trigger set_ai_training_examples_updated_at
before update on public.ai_training_examples
for each row execute function public.set_updated_at();

alter table public.ai_model_runs enable row level security;
alter table public.ai_training_examples enable row level security;
alter table public.ai_output_feedback enable row level security;

drop policy if exists "Users can view owned AI model runs"
  on public.ai_model_runs;
create policy "Users can view owned AI model runs"
on public.ai_model_runs for select
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.tenders
    where tenders.id = ai_model_runs.tender_id
      and tenders.user_id = auth.uid()
  )
);

drop policy if exists "Users can view owned AI feedback"
  on public.ai_output_feedback;
create policy "Users can view owned AI feedback"
on public.ai_output_feedback for select
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.tenders
    where tenders.id = ai_output_feedback.tender_id
      and tenders.user_id = auth.uid()
  )
);

drop policy if exists "Users can create owned AI feedback"
  on public.ai_output_feedback;
create policy "Users can create owned AI feedback"
on public.ai_output_feedback for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.tenders
    where tenders.id = ai_output_feedback.tender_id
      and tenders.user_id = auth.uid()
  )
  and (
    model_run_id is null
    or exists (
      select 1 from public.ai_model_runs
      where ai_model_runs.id = ai_output_feedback.model_run_id
        and ai_model_runs.tender_id = ai_output_feedback.tender_id
        and ai_model_runs.user_id = auth.uid()
    )
  )
);

comment on table public.ai_model_runs is
  'Provider-neutral model telemetry. Stores hashes and metadata, never prompts or credentials.';
comment on table public.ai_training_examples is
  'Backend/admin-only reviewed dataset candidates; no ordinary-user RLS policies are granted.';
comment on table public.ai_output_feedback is
  'Field-level user feedback scoped to tenders owned by the authenticated user.';
