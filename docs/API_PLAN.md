# TenderMate AI API Plan

## Current Endpoints

### `GET /health`

Returns backend health and service status.

### `POST /api/v1/auth/signup`

Creates an `app_users` row in Supabase, hashes the password with Argon2, and returns a JWT access token plus the created user profile.

The Next.js signup page calls this endpoint through `NEXT_PUBLIC_API_BASE_URL`, stores the returned access token in browser `localStorage` for the MVP, and then loads protected frontend routes with `Authorization: Bearer <token>`.

Rate limit: 5 requests/hour per IP.

### `POST /api/v1/auth/login`

Verifies email and password for an active user and returns a JWT access token plus the user profile.

The Next.js login page stores the returned token and user profile client-side for the MVP. Real secrets must not be committed; local API configuration belongs in ignored `.env.local` files.

Rate limit: 10 requests/15 minutes per IP.

Failed login protection:

- Failed password attempts increment `app_users.failed_login_count`.
- After 5 failed attempts, the account is locked for 15 minutes.
- Successful login resets `failed_login_count`, clears `locked_until`, and sets `last_login_at`.
- Locked accounts return `423 Locked` with `Account temporarily locked due to multiple failed login attempts.`

### `GET /api/v1/auth/me`

Protected endpoint. Returns the current user identified by `Authorization: Bearer <token>`.

The frontend `AuthProvider` calls this endpoint on app load when a token exists. Invalid or expired tokens clear local auth state. The response includes trial and billing fields:

- `free_analysis_credits`
- `plan_name`
- `subscription_status`

Rate limit: 120 requests/minute per user, with an IP-based guard for missing or invalid token requests.

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

Rate limit: 10 requests/hour per user.

Daily quota: 5 placeholder PDF uploads per user per UTC day. On success, the backend records a `pdf_upload` usage event and a `tender_upload_placeholder` audit log. If the quota is exceeded, the endpoint returns:

```json
{
  "detail": "Daily upload limit reached. Please try again tomorrow."
}
```

with HTTP status `429 Too Many Requests`.

### `GET /api/v1/billing/usage`

Protected endpoint. Returns the current user's trial and usage state:

- `free_analysis_credits`
- `plan_name`
- `subscription_status`
- `can_run_ai_analysis`
- `usage_counts.analysis_completed`
- `usage_counts.pdf_upload_today`
- `usage_counts.total_events`

Rate limit: 120 requests/minute per user.

### `GET /api/v1/billing/plans`

Protected endpoint. Returns static MVP plan metadata:

- Free: 5 analyses included, ₹0
- Starter: 25 analyses/month, ₹199/month, coming soon
- Pro: 100 analyses/month, ₹499/month, coming soon
- Business: 300 analyses/month, ₹999/month, coming soon

### `POST /api/v1/billing/create-checkout`

Protected endpoint. Returns a placeholder response while live payments are disabled:

```json
{
  "message": "Payments are coming soon. Your free trial is active.",
  "payments_enabled": false,
  "checkout_url": null
}
```

This endpoint must not connect to Razorpay until the payment integration task is started.

Rate limit: 5 requests/hour per user.

## Common Security Responses

### `401 Unauthorized`

Used for missing, invalid, or expired bearer tokens.

### `403 Forbidden`

Used for inactive user accounts.

### `423 Locked`

Used when an account is temporarily locked after repeated failed login attempts.

### `429 Too Many Requests`

Used for endpoint rate limits and user quota limits.

Generic rate-limit response:

```json
{
  "detail": "Too many requests. Please try again later."
}
```

## Future Endpoints

### PDF Extraction

- `POST /api/v1/uploads/{upload_id}/extract`
- `GET /api/v1/uploads/{upload_id}/extraction`

Purpose: extract text from an uploaded PDF and expose extraction status/results.

### Gemini Analysis

- `POST /api/v1/tenders/{id}/analyze`
- `GET /api/v1/tenders/{id}/analysis`

Purpose: run AI analysis after extraction and return frontend-compatible `analysis_json`.

The future analyze endpoint should depend on `require_analysis_credit`. When the user has no free credits and no active subscription, it should return:

```json
{
  "detail": "Free analysis limit reached. Please upgrade to continue."
}
```

with HTTP status `402 Payment Required`.

The endpoint must call `consume_analysis_credit(user_id, tender_id)` only after PDF extraction, Gemini analysis, and persistence have succeeded. Failed analysis attempts must not deduct trial credits.

### Upload Storage

- `POST /api/v1/uploads/presign`
- `GET /api/v1/uploads/{upload_id}`

Purpose: support direct browser uploads to Supabase Storage and track upload metadata.
