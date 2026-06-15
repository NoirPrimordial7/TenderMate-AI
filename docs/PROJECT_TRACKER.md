# TenderMate AI Project Tracker

## Done

- Frontend MVP uses static JSON tender data through repository and service layers.
- Added FastAPI backend folder structure.
- Added health, tender list, latest tender, tender detail, and upload placeholder endpoints.
- Verified FastAPI backend local run with Uvicorn.
- Added Postman API testing documentation for the current backend endpoints.
- Added Supabase/PostgreSQL MVP schema for `tenders` and `uploads`.
- Added seed data with `analysis_json` fields matching the current frontend schema.
- Supabase project setup was completed manually.
- Backend repository supports Supabase-backed tender reads with mock fallback when config is missing.
- Frontend JWT integration completed for signup, login, logout, protected pages, `/auth/me`, tender history, and latest tender reads.
- Backend deployment prep completed.
- Backend deployment completed.
- Frontend deployment completed.

## In Progress

- Production MVP polish is in progress.

## Next

- Real PDF upload with Supabase Storage.
- PDF text extraction.
- Gemini tender analysis.
- Persist extracted tender analyses for authenticated frontend users.
- Persist extracted tender analyses for authenticated frontend users.

## Blocked

- No blockers for backend foundation.
- No blockers for Supabase read testing.

## Decisions Taken

- Keep the current frontend JSON schema canonical for now.
- Preserve `analysis_json` field names: `id`, `snapshot`, `decision`, `scores`, `beforeApply`, `documents`, `eligibility`, `financials`, `technical`, `dates`, `risks`, `missingInformation`, `departmentQuestions`, and `proposalDraft`.
- Use FastAPI for a small, typed Python backend that can later host PDF extraction and AI analysis.
- Keep the backend path clean: routes call services, services call repositories.
- Use JWT bearer tokens to identify the current backend user.
- Store tender history by `tenders.user_id`; uploads also carry `uploads.user_id`.
- Do not add Gemini or PDF extraction in this foundation step.
- Store the frontend JWT in `localStorage` for the MVP and attach it as `Authorization: Bearer <token>`.
- Keep static frontend tender data as a development fallback only; authenticated pages should prefer the protected FastAPI API.

## Commit Log

- 2026-06-13: Add FastAPI backend and database foundation.
- 2026-06-13: Add Postman API testing guide.
- 2026-06-15: Connect frontend to JWT authentication.
