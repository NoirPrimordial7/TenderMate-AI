begin;

alter table public.app_users
add column if not exists preferred_language text not null default 'en';

alter table public.app_users
add column if not exists preferred_analysis_language text not null default 'en';

alter table public.app_users
drop constraint if exists app_users_preferred_language_check;

alter table public.app_users
add constraint app_users_preferred_language_check
check (preferred_language in ('en', 'hi', 'mr'));

alter table public.app_users
drop constraint if exists app_users_preferred_analysis_language_check;

alter table public.app_users
add constraint app_users_preferred_analysis_language_check
check (preferred_analysis_language in ('en', 'hi', 'mr'));

comment on column public.app_users.preferred_language is
'TenderMate interface language: en, hi, or mr.';

comment on column public.app_users.preferred_analysis_language is
'Preferred language for TenderMate explanations. Original tender quotations remain unchanged.';

commit;
