# TenderMate AI Architecture

## Current Frontend Architecture

The current frontend MVP is a Next.js app that reads static tender JSON files from `src/data/tenders`. UI pages and components do not read the JSON directly. They call the existing `TenderService`, which depends on a repository implementation. This repository/service pattern should remain the frontend integration boundary when the backend is connected.

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

## Database Role

Supabase/PostgreSQL will store uploaded tender metadata and analysis results.

The MVP database has three core tables:

- `app_users`: logged-in MSME user profiles and password hashes.
- `tenders`: primary tender records and `analysis_json` payloads owned by `app_users`.
- `uploads`: uploaded PDF metadata linked to a tender and the owning user.

The `analysis_json` column is `jsonb` so the current frontend analysis shape can be stored while the schema is still evolving.

JWT access tokens identify the current user through the `sub` claim. Protected tender routes load that user and filter tender history by `tenders.user_id`, so one user cannot read another user's tender history. Upload placeholder metadata is also linked by `uploads.user_id`.

## Future AI/PDF Pipeline

The future pipeline should be added in stages:

1. Upload PDF metadata and file storage path.
2. Extract text from the PDF.
3. Store extracted text or extraction artifacts.
4. Run Gemini analysis on extracted text.
5. Persist frontend-compatible `analysis_json`.
6. Add frontend login/signup and token storage.
7. Let the frontend switch from static JSON to the protected API repository implementation.

## Why FastAPI Is Used

FastAPI is a good fit for this backend because it is lightweight, has strong typing through Pydantic, generates OpenAPI docs automatically, and works well for Python-based PDF extraction and AI orchestration later. It also lets the MVP expose useful API contracts before the AI pipeline is implemented.
