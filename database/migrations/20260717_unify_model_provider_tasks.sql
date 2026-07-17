do $$
begin
  if to_regclass('public.ai_model_runs') is not null then
    alter table public.ai_model_runs
      drop constraint if exists ai_model_runs_task_check;
    alter table public.ai_model_runs
      add constraint ai_model_runs_task_check
      check (task in ('tender_analysis', 'tender_question', 'answer_question'));
  end if;
end;
$$;
