# TenderMate AI Architecture

## Current Frontend Architecture

The current frontend MVP is a Next.js app that reads static tender JSON files from `src/data/tenders`. UI pages and components do not read the JSON directly. They call the existing `TenderService`, which depends on a repository implementation. This repository/service pattern should remain the frontend integration boundary when the backend is connected.

The frontend now also has an auth-aware API client that reads `NEXT_PUBLIC_API_BASE_URL`, attaches `Authorization: Bearer <token>` when a JWT is available, and clears local auth state on protected `401` responses. JWTs and the current user profile are stored in browser `localStorage` for the MVP.

`AuthProvider` owns client auth state. On app load it reads the stored token, calls `GET /api/v1/auth/me`, keeps the user when the token is valid, and clears auth when the token is invalid. Protected pages such as dashboard, history, and tender detail require a logged-in user before loading backend tender data.

The auth user profile now carries the trial fields `free_analysis_credits`, `plan_name`, and `subscription_status`. The header and dashboard use these fields to show trial usage, and the pricing page calls the billing API when a user is logged in. Payments are not live yet; upgrade actions call a placeholder checkout endpoint.

The frontend tender analysis schema is canonical for now. Backend `analysis_json` must keep the same field names currently used by the UI:

- `id`
- `snapshot`
- `decision`
- `scores`
- `beforeApply`
- `documents`
- `eligibility`
- `financials`
- `technical`
- `dates`
- `risks`
- `missingInformation`
- `departmentQuestions`
- `proposalDraft`

## New Backend Architecture

The backend uses FastAPI with a simple layered structure:

- `api/v1/routes`: HTTP route definitions.
- `services`: application workflow methods.
- `repositories`: data access boundary.
- `schemas`: Pydantic response and payload models.
- `db`: Supabase client creation.
- `core`: environment and runtime configuration.

Tender read endpoints use the existing route -> service -> repository path. The repository reads from Supabase `public.tenders` when Supabase config is available, and keeps the mock fallback when config is missing so the backend contract can still be exercised without credentials.

Authentication follows the same route -> service -> repository split. Auth routes call `AuthService`, which hashes passwords, verifies credentials, creates JWT access tokens, and uses `AuthRepository` as the Supabase `app_users` boundary.

Trial and billing logic is handled by `UsageService`. It can summarize usage, check whether a user can run AI analysis, record usage events, and deduct one free analysis credit after a successful future AI analysis. The `require_analysis_credit` dependency is ready for the future Gemini endpoint and returns `402 Payment Required` when a user has no free credits and no active subscription.

Security hardening now sits beside the route layer:

- `RateLimitService` provides lightweight in-memory rate limiting for auth, billing, and upload endpoints. It is intentionally isolated behind a service/dependency boundary so Redis or Upstash can replace the store later.
- Failed login protection tracks `failed_login_count`, `locked_until`, and `last_login_at` on `app_users`.
- `record_audit_log` writes best-effort operational audit events to Supabase without blocking the main request when audit insertion fails.
- Upload quota checks use `user_usage_events` before storing PDFs and creating upload records.

Real PDF upload follows the same route -> service -> repository structure:

- `POST /api/v1/tenders/upload` accepts multipart PDF uploads from logged-in users.
- `UploadService` validates file type, rejects empty files, enforces the 20 MB limit, checks the daily upload quota, creates the tender row, uploads to Storage, creates upload metadata, and records usage.
- `TenderRepository` creates the user-owned `tenders` row with `status = 'uploaded'` and nullable `analysis_json`.
- `UploadRepository` writes the PDF to Supabase Storage and stores the metadata row in `public.uploads`.

PDF text extraction also follows route -> service -> repository:

- `POST /api/v1/tenders/{id}/extract` is protected by JWT and scoped to the current tender owner.
- `PDFExtractionService` confirms ownership, loads upload metadata, downloads the private PDF, extracts text page by page with `pypdf`, stores page rows, updates tender status, and records usage.
- `PDFExtractionRepository` owns Supabase Storage download, `tender_pages` replacement, and tender extraction status updates.
- Failed extraction marks the tender `status = 'failed'` with a friendly `error_message` and records a `pdf_extract_failed` audit log.

Frontend tender reads now go through a backend tender repository that adapts FastAPI `TenderResponse` records into the existing UI-friendly tender analysis and history shapes. Static JSON remains available for development, but authenticated frontend pages prefer the protected API.

## Database Role

Supabase/PostgreSQL stores uploaded tender metadata, extracted page text, and analysis results.

The MVP database has five core tables:

- `app_users`: logged-in MSME user profiles, password hashes, free trial credits, plan name, and subscription status.
- `tenders`: primary tender records and `analysis_json` payloads owned by `app_users`.
- `uploads`: uploaded PDF metadata linked to a tender and the owning user.
- `tender_pages`: page-wise extracted PDF text linked to a tender and the owning user.
- `user_usage_events`: append-only usage events such as successful AI analyses.
- `payments`: future payment records from manual or provider-backed checkout flows.
- `audit_logs`: security and operational audit trail for auth, upload, and billing actions.

The `analysis_json` column is `jsonb` so the current frontend analysis shape can be stored while the schema is still evolving. The `tender_pages` table keeps one row per `tender_id` and `page_number`, which preserves source-page boundaries for future Gemini prompts and source references.

JWT access tokens identify the current user through the `sub` claim. Protected tender routes load that user and filter tender history by `tenders.user_id`, so one user cannot read another user's tender history. Upload metadata is also linked by `uploads.user_id`.

Each new user starts with `free_analysis_credits = 5`, `plan_name = 'free'`, and `subscription_status = 'trial'`. A credit is deducted only when a future AI analysis succeeds. Failed analysis attempts must not call the credit consumption method. The payments table stores payment metadata only; card and bank details must never be stored.

Upload quotas and analysis credits are separate protections. The MVP allows at most 5 PDF uploads per user per UTC day, recorded as `pdf_upload` events in `user_usage_events`. AI analysis remains protected by the 5 free-credit rule until paid subscriptions are enabled. Future paid users may bypass the free-credit limit only when `subscription_status = 'active'`.

Audit logs record actions such as signup, login success/failure, account lock, optional `/auth/me` access, `upload_pdf`, `extract_pdf`, `pdf_extract_failed`, billing usage views, and checkout placeholder calls. They are for operational review and should not contain card, bank, provider secret data, or raw PDF contents.

## Supabase Storage

PDF files are stored in a private Supabase Storage bucket named `tender-pdfs`. The frontend never receives the Supabase service role key and never writes directly to Storage.

Storage path pattern:

```text
users/{user_id}/tenders/{tender_id}/original.pdf
```

This path keeps files grouped by owner and tender. The `uploads` table stores `storage_bucket = 'tender-pdfs'`, the storage path, original file name, file size, MIME type, and an optional `pdf_url`. Because the bucket is private, `pdf_url` is nullable; future download or preview work should generate short-lived signed URLs from the backend.

## Deployment Architecture

Production deployment should follow this flow:

```text
Vercel Frontend
    | HTTPS
    v
FastAPI Backend
    | service role key, server-side only
    v
Supabase PostgreSQL + private Storage bucket
```

The frontend only receives `NEXT_PUBLIC_API_BASE_URL`, which points to the deployed FastAPI backend plus `/api/v1`. Backend secrets stay in the FastAPI deployment environment: Supabase URL, Supabase service role key, Supabase anon key, and JWT secret. The Supabase service role key must never go to the frontend.

FastAPI CORS should explicitly allow the deployed Vercel URL through `FRONTEND_URL` or `CORS_ORIGINS`. Do not use unrestricted `*` origins with credentialed auth requests.

## Future AI/PDF Pipeline

Real PDF upload, private Storage persistence, and page-wise text extraction are now in place. The remaining pipeline should be added in stages:

1. Run Gemini analysis on extracted page text.
2. Gate analysis with `require_analysis_credit`.
3. Persist frontend-compatible `analysis_json`.
4. Call `consume_analysis_credit` only after the analysis has been saved successfully.
5. Let authenticated frontend users view generated analyses from the protected API.

## Future Payment Flow

The current billing API is a foundation only. `GET /api/v1/billing/usage` returns the current trial state, `GET /api/v1/billing/plans` returns MVP plan metadata, and `POST /api/v1/billing/create-checkout` returns a friendly coming-soon response.

When Razorpay is added later, the backend should create provider orders server-side, verify webhooks server-side, update `payments`, and then update `app_users.plan_name` and `app_users.subscription_status`. Provider secrets must remain in the backend environment and must never be exposed through `NEXT_PUBLIC_*` variables.

## Why FastAPI Is Used

FastAPI is a good fit for this backend because it is lightweight, has strong typing through Pydantic, generates OpenAPI docs automatically, and works well for Python-based PDF extraction and AI orchestration later. It also lets the MVP expose useful API contracts before the AI pipeline is implemented.
