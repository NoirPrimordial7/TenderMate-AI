# TenderMate AI API Plan

## Current Endpoints

### `GET /health`

Returns backend health and service status.

### `POST /api/v1/auth/signup`

Creates an `app_users` row in Supabase, hashes the password with Argon2, and returns a JWT access token plus the created user profile.

The Next.js signup page calls this endpoint through `NEXT_PUBLIC_API_BASE_URL`, stores the returned access token in browser `localStorage` for the MVP, and then loads protected frontend routes with `Authorization: Bearer <token>`.

### `POST /api/v1/auth/login`

Verifies email and password for an active user and returns a JWT access token plus the user profile.

The Next.js login page stores the returned token and user profile client-side for the MVP. Real secrets must not be committed; local API configuration belongs in ignored `.env.local` files.

### `GET /api/v1/auth/me`

Protected endpoint. Returns the current user identified by `Authorization: Bearer <token>`.

The frontend `AuthProvider` calls this endpoint on app load when a token exists. Invalid or expired tokens clear local auth state.

### `GET /api/v1/tenders`

Protected endpoint. Returns only Supabase `public.tenders` rows where `user_id` matches the current JWT user. The repository still has mock fallback behavior for development when Supabase config is missing, but protected API access expects a valid user token.

The frontend history page now calls this endpoint for authenticated users. If the backend is unavailable, the page shows a friendly error instead of showing another user's data.

### `GET /api/v1/tenders/latest`

Protected endpoint. Returns the newest tender by `created_at` for the current JWT user only.

The frontend dashboard calls this endpoint for authenticated users and shows an empty state when no analyzed tender is available.

### `GET /api/v1/tenders/{id}`

Protected endpoint. Returns one tender by UUID only when it belongs to the current JWT user. Other users' tenders return `404 Not Found`.

### `POST /api/v1/tenders/upload`

Protected endpoint. Creates placeholder upload metadata linked to the current JWT user. It accepts request metadata for now but does not store files, extract PDFs, or run AI.

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
