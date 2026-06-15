# TenderMate AI API Plan

## Current Endpoints

### `GET /health`

Returns backend health and service status.

### `GET /api/v1/tenders`

Returns tender rows from Supabase `public.tenders` when Supabase config is available. Falls back to the current mock tender list when config is missing.

### `GET /api/v1/tenders/latest`

Returns the newest Supabase tender by `created_at` when Supabase config is available. Falls back to the latest mock tender when config is missing.

### `GET /api/v1/tenders/{id}`

Returns one Supabase tender by UUID when Supabase config is available. Falls back to the matching mock tender when config is missing.

### `POST /api/v1/tenders/upload`

Returns a placeholder upload response. It accepts request metadata for now but does not store files, extract PDFs, or run AI.

## Future Endpoints

### PDF Extraction

- `POST /api/v1/uploads/{upload_id}/extract`
- `GET /api/v1/uploads/{upload_id}/extraction`

Purpose: extract text from an uploaded PDF and expose extraction status/results.

### Gemini Analysis

- `POST /api/v1/tenders/{id}/analyze`
- `GET /api/v1/tenders/{id}/analysis`

Purpose: run AI analysis after extraction and return frontend-compatible `analysis_json`.

### Upload Storage

- `POST /api/v1/uploads/presign`
- `GET /api/v1/uploads/{upload_id}`

Purpose: support direct browser uploads to Supabase Storage and track upload metadata.
