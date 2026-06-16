# Security Hardening Plan

TenderMate AI now has an MVP security layer for auth, rate limits, quotas, file upload, PDF extraction, Gemini analysis, and audit logging. The current implementation is intentionally lightweight and can be expanded before payments go live.

## Auth Protections

- JWT bearer tokens protect dashboard, tender history, tender detail, upload, and billing APIs.
- Tender reads are scoped by `tenders.user_id`.
- Upload metadata is scoped by `uploads.user_id`.
- Backend service role credentials stay in the backend environment only.
- Frontend receives only `NEXT_PUBLIC_API_BASE_URL`.

## Rate Limits

Current in-memory limits:

- `POST /api/v1/auth/signup`: 5 requests/hour per IP.
- `POST /api/v1/auth/login`: 10 requests/15 minutes per IP.
- `GET /api/v1/auth/me`: 120 requests/minute per user, with IP guarding for invalid token calls.
- `POST /api/v1/tenders/upload`: 10 requests/hour per user.
- `POST /api/v1/tenders/{id}/extract`: 10 requests/hour per user.
- `POST /api/v1/tenders/{id}/analyze`: 10 requests/hour per user.
- `GET /api/v1/billing/usage`: 120 requests/minute per user.
- `POST /api/v1/billing/create-checkout`: 5 requests/hour per user.

The rate limit store is in memory for the MVP. Replace it with Redis or Upstash before running multiple backend instances or handling higher production traffic.

## Failed Login Lockout

- `failed_login_count` increments on invalid password attempts.
- Accounts lock after 5 failed attempts.
- `locked_until` is set for 15 minutes by default.
- Successful login resets `failed_login_count`, clears `locked_until`, and sets `last_login_at`.
- Locked accounts return `423 Locked` with a friendly message.

## User Quotas

- PDF uploads are capped at 5 per user per UTC day.
- Successful uploads record `pdf_upload` usage events.
- AI analysis remains capped by `free_analysis_credits`.
- Future paid users can bypass the free-credit limit only when `subscription_status = 'active'`.

## Audit Logs

The `audit_logs` table records operational events:

- `signup`
- `login_success`
- `login_failed`
- `account_locked`
- `auth_me_access`
- `upload_pdf`
- `extract_pdf`
- `pdf_extract_failed`
- `run_gemini_analysis`
- `gemini_analysis_failed`
- `billing_usage_view`
- `checkout_placeholder`

Audit logging is best-effort so a logging failure does not block user-facing flows. Metadata must not contain passwords, JWTs, card data, bank data, or provider secrets.

## Upload Security Checklist

- Enforce MIME type and file extension checks.
- Set a backend-approved max file size.
- Store files under user-scoped paths.
- Avoid trusting frontend-provided file names for storage paths.
- Add virus/malware scanning when feasible.
- Strip or normalize unsafe filename characters.
- Keep upload metadata user-scoped.
- Return friendly errors for rejected files.

## Gemini Cost Protection Checklist

- Gate analysis with credit checks.
- Enforce daily and monthly analysis quotas.
- Deduct free credits only after successful persisted analysis.
- Record AI analysis usage events.
- Set request size limits for extracted text.
- Add timeouts and retry limits around model calls.
- Log model cost metadata without storing secrets.
- Keep Gemini API keys backend-only.

## Admin Role Protection Checklist

Before adding admin tools:

- Add explicit admin roles and route guards.
- Require audit logs for every manual credit or plan adjustment.
- Never expose service role keys in admin frontend code.
- Scope admin APIs to least privilege.
- Add rate limits to admin endpoints.
- Review all admin actions for irreversible data changes.
