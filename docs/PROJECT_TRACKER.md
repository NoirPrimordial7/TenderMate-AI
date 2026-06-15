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

## In Progress

- Auth + JWT + user-linked tender history is the current phase.
- Tender and upload APIs are being scoped to the logged-in user profile.

## Next

- Postman test APIs using real Supabase data.
- Add frontend login/signup integration.
- Add real file upload storage flow.
- Add PDF extraction pipeline.
- Add Gemini analysis pipeline after PDF extraction is stable.
- Add frontend API repository implementation behind the existing frontend repository interface.

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

## Commit Log

- 2026-06-13: Add FastAPI backend and database foundation.
- 2026-06-13: Add Postman API testing guide.
