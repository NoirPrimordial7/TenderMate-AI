create table if not exists public.tender_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references public.app_users(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  language text not null check (language in ('en', 'hi', 'mr')),
  scope_status text not null check (scope_status in ('accepted', 'rejected', 'uncertain')),
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  citations jsonb not null default '[]'::jsonb,
  not_found boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_tender_chat_messages_tender_id on public.tender_chat_messages (tender_id);
create index if not exists idx_tender_chat_messages_user_id on public.tender_chat_messages (user_id);
create index if not exists idx_tender_chat_messages_conversation_id on public.tender_chat_messages (conversation_id);
create index if not exists idx_tender_chat_messages_created_at on public.tender_chat_messages (created_at desc);
create index if not exists idx_tender_chat_messages_user_tender_created on public.tender_chat_messages (user_id, tender_id, created_at);

alter table public.tender_chat_messages enable row level security;

drop policy if exists tender_chat_messages_select_own on public.tender_chat_messages;
create policy tender_chat_messages_select_own on public.tender_chat_messages
for select using (
  auth.uid() = user_id
  and exists (select 1 from public.tenders t where t.id = tender_id and t.user_id = auth.uid())
);

drop policy if exists tender_chat_messages_insert_own on public.tender_chat_messages;
create policy tender_chat_messages_insert_own on public.tender_chat_messages
for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.tenders t where t.id = tender_id and t.user_id = auth.uid())
);

drop policy if exists tender_chat_messages_delete_own on public.tender_chat_messages;
create policy tender_chat_messages_delete_own on public.tender_chat_messages
for delete using (
  auth.uid() = user_id
  and exists (select 1 from public.tenders t where t.id = tender_id and t.user_id = auth.uid())
);
