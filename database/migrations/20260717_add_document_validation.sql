alter table public.tenders
  add column if not exists document_type text,
  add column if not exists document_validation_status text not null default 'pending',
  add column if not exists document_validation_confidence numeric,
  add column if not exists document_validation_reason text;

alter table public.tenders
  drop constraint if exists tenders_document_type_check;
alter table public.tenders
  add constraint tenders_document_type_check
  check (document_type is null or document_type in ('tender', 'non_tender', 'uncertain'));

alter table public.tenders
  drop constraint if exists tenders_document_validation_status_check;
alter table public.tenders
  add constraint tenders_document_validation_status_check
  check (document_validation_status in ('valid', 'invalid', 'review', 'pending'));

alter table public.tenders
  drop constraint if exists tenders_document_validation_confidence_check;
alter table public.tenders
  add constraint tenders_document_validation_confidence_check
  check (document_validation_confidence is null or (document_validation_confidence >= 0 and document_validation_confidence <= 1));

-- Classify legacy extracted rows from the stored preview and filename so an
-- obvious resume cannot remain eligible for the dashboard priority slot.
-- New and re-extracted files are classified by the backend using full text.
with legacy_signals as (
  select
    id,
    lower(concat_ws(' ', original_file_name, title, extracted_text_preview)) as body
  from public.tenders
  where document_validation_status = 'pending'
    and status in ('extracted', 'analyzed', 'failed')
), scored as (
  select
    id,
    body,
    (case when body like '%notice inviting tender%' then 4 else 0 end
      + case when body like '%tender notice%' then 4 else 0 end
      + case when body like '%request for quotation%' then 4 else 0 end
      + case when body like '%bid submission%' then 3 else 0 end
      + case when body like '%earnest money deposit%' then 3 else 0 end
      + case when body like '%procurement%' then 2 else 0 end
      + case when body like '%submission deadline%' then 3 else 0 end
      + case when body like '%eligibility criteria%' then 3 else 0 end
      + case when body like '%bid security%' then 3 else 0 end
      + case when body like '%emd%' then 2 else 0 end) as positive_score,
    (case when body like '%curriculum vitae%' then 5 else 0 end
      + case when body like '%career objective%' then 4 else 0 end
      + case when body like '%personal profile%' then 4 else 0 end
      + case when body like '%work experience%' then 2 else 0 end
      + case when body like '%education%' then 2 else 0 end
      + case when body like '%internship resume%' then 5 else 0 end
      + case when body like '%resume%' then 4 else 0 end) as negative_score,
    (case when body like '%notice inviting tender%' then 1 else 0 end
      + case when body like '%tender notice%' then 1 else 0 end
      + case when body like '%request for quotation%' then 1 else 0 end
      + case when body like '%bid submission%' then 1 else 0 end
      + case when body like '%earnest money deposit%' then 1 else 0 end
      + case when body like '%procurement%' then 1 else 0 end
      + case when body like '%submission deadline%' then 1 else 0 end
      + case when body like '%eligibility criteria%' then 1 else 0 end
      + case when body like '%bid security%' then 1 else 0 end
      + case when body like '%emd%' then 1 else 0 end) as positive_count
  from legacy_signals
), classified as (
  select
    id,
    case
      when negative_score >= 5 and negative_score >= positive_score + 2 then 'non_tender'
      when positive_score >= 6 and positive_count >= 2 and positive_score >= negative_score + 2 then 'tender'
      else 'uncertain'
    end as document_type,
    case
      when negative_score >= 5 and negative_score >= positive_score + 2 then 'invalid'
      when positive_score >= 6 and positive_count >= 2 and positive_score >= negative_score + 2 then 'valid'
      else 'review'
    end as validation_status,
    positive_score,
    negative_score
  from scored
)
update public.tenders as tenders
set
  document_type = classified.document_type,
  document_validation_status = classified.validation_status,
  document_validation_confidence = case
    when classified.validation_status = 'invalid' then least(0.98, 0.62 + greatest(classified.negative_score - classified.positive_score, 0) * 0.04)
    when classified.validation_status = 'valid' then least(0.98, 0.58 + greatest(classified.positive_score - classified.negative_score, 0) * 0.035)
    else 0.5
  end,
  document_validation_reason = case
    when classified.validation_status = 'invalid' then 'Legacy content contains multiple non-tender indicators.'
    when classified.validation_status = 'valid' then 'Legacy content contains multiple tender indicators.'
    else 'Legacy content requires document-type review.'
  end
from classified
where tenders.id = classified.id;
