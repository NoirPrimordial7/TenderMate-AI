# PDF Text Extraction Plan

## Extraction Flow

1. A logged-in user opens a tender detail page for an uploaded PDF.
2. The frontend calls `POST /api/v1/tenders/{id}/extract`.
3. The backend confirms the tender belongs to the current JWT user.
4. The backend loads the latest `uploads` row for the tender.
5. The backend downloads `users/{user_id}/tenders/{tender_id}/original.pdf` from the private `tender-pdfs` Storage bucket.
6. `pypdf` reads the PDF and extracts text page by page.
7. Existing `tender_pages` rows for the tender are deleted.
8. Fresh page rows are inserted.
9. The tender is updated to `status = 'extracted'` with `page_count`, `extracted_text_preview`, and `error_message = null`.
10. The backend records `pdf_extract` usage and an `extract_pdf` audit log.

## Database Design

`public.tender_pages` stores one row per tender page:

- `tender_id`
- `user_id`
- `page_number`
- `text`
- `created_at`

The unique index on `(tender_id, page_number)` keeps extraction idempotent after old rows are removed. The `tenders` table stores summary fields used by the frontend:

- `status`
- `page_count`
- `extracted_text_preview`
- `error_message`

## Error Handling

- Missing or unauthorized tenders return `404`.
- Missing upload metadata returns a friendly `400`.
- Storage download, parser, dependency, or database failures return a friendly `500`.
- Failed extraction marks the tender `status = 'failed'` and stores a safe `error_message`.
- Scanned PDFs with no selectable text return success with `pages_with_text = 0`; OCR is a later enhancement.

## Source Reference Importance

Page-wise text storage preserves source boundaries for Gemini prompts. Analysis outputs cite exact page numbers in eligibility, document, financial, technical, and risk sections instead of returning unsupported recommendations.

## Current Gemini Analysis Phase

Gemini analysis now reads `tender_pages`, builds a bounded prompt with page references, calls Gemini server-side, persists frontend-compatible `analysis_json`, and deducts free analysis credits only after the analysis is saved successfully.
