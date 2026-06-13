# TenderMate AI API Plan

## Current Endpoints

### `GET /health`

Returns backend health and service status.

### `GET /api/v1/tenders`

Returns the current mock tender list. Later this will read from Supabase.

### `GET /api/v1/tenders/latest`

Returns the latest mock tender. Later this will read the newest analyzed or uploaded tender from Supabase.

### `GET /api/v1/tenders/{id}`

Returns one mock tender by UUID. Later this will fetch a tender record and its `analysis_json` from Supabase.

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
