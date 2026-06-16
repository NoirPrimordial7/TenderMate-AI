# Gemini OCR Render Plan

## Why Tesseract Is Avoided On Render

Tesseract requires native binaries and language data packages. Those are easy to miss or mismatch on Render unless the service image is customized, which makes deploys more fragile for an MVP backend.

TenderMate should not depend on `pytesseract`, system packages, or server-level OCR binaries. Keeping OCR inside the existing Gemini integration preserves the current Render deployment model.

## Why Gemini OCR Works On Render

The backend already uses the Google GenAI SDK and backend-only `GEMINI_API_KEY`. Gemini accepts inline PDF bytes with MIME type `application/pdf`, so the FastAPI service can OCR scanned tender notices without installing extra OS packages.

Secrets remain server-side. The frontend never receives the Gemini key or the Supabase service role key.

## Flow

1. User uploads a PDF to private Supabase Storage.
2. Extraction downloads the original PDF bytes from Storage.
3. `pypdf` extracts page text first.
4. If total extracted text is at least `OCR_MIN_TEXT_THRESHOLD`, store normal text in `tender_pages`.
5. If extracted text is too low and `GEMINI_OCR_ENABLED=true`, send the original PDF bytes to Gemini OCR as `application/pdf`.
6. Gemini returns strict JSON with `pages`, `page_number`, and `text`.
7. Store OCR text page by page in `tender_pages`.
8. Mark the tender with `extraction_method = 'gemini_ocr'` or `mixed`, set `ocr_used = true`, and continue to the existing Gemini tender analysis flow.

## Limits

Current defaults:

- `OCR_MIN_TEXT_THRESHOLD=300`
- `MAX_OCR_PDF_SIZE_MB=20`
- `OCR_MAX_PAGES=30`
- `GEMINI_OCR_TIMEOUT_SECONDS=90`
- `GEMINI_OCR_MODEL=gemini-3.1-flash-lite`

If OCR cannot read a scan and no usable `pypdf` text exists, the tender is marked failed with: `OCR could not read this scanned PDF. Please upload a clearer PDF.`

## Costs And Credits

Gemini OCR can create Gemini API usage costs, so OCR attempts are recorded as `gemini_ocr` usage events.

OCR does not deduct TenderMate AI analysis credits. Credits are deducted only after final tender analysis succeeds and `analysis_json` is saved.

## Privacy Note

Scanned tender PDFs are sent from the backend to Gemini for transcription when fallback OCR is needed. The backend should not log raw PDF contents, OCR text, Gemini raw errors, API keys, or Supabase service role keys.

Audit logs should contain operational metadata only, such as tender ID, page count, extraction method, and whether OCR completed or failed.

## Future Improvements

- Add per-page OCR fallback for mixed PDFs when only selected pages are image-only.
- Store OCR confidence if the model response or a future OCR provider supplies it.
- Add admin reporting for OCR usage and failure rates.
- Add a queue for long OCR jobs if documents become larger than the current synchronous limits.
- Add image upload OCR for non-PDF scanned notices if the product accepts tender images later.
