# TenderMate AI Project Tracker

## Done

- Frontend MVP uses static JSON tender data through repository and service layers.
- Added FastAPI backend folder structure.
- Added health, tender list, latest tender, tender detail, and upload placeholder endpoints.
- Verified FastAPI backend local run with Uvicorn.
- Added Postman API testing documentation for the current backend endpoints.
- Added Supabase/PostgreSQL MVP schema for `tenders` and `uploads`.
- Added seed data with `analysis_json` fields matching the current frontend schema.

## In Progress

- Backend routes currently return mock responses.
- Postman API testing is ready for manual screenshot capture and college submission evidence.
- Supabase client is prepared but not wired into repository methods.

## Next

- Connect `TenderRepository` to Supabase when credentials are available.
- Add real file upload storage flow.
- Add PDF extraction pipeline.
- Add Gemini analysis pipeline after PDF extraction is stable.
- Add frontend API repository implementation behind the existing frontend repository interface.

## Blocked

- No blockers for backend foundation.
- Real Supabase integration is waiting on project credentials and storage decisions.

## Decisions Taken

- Keep the current frontend JSON schema canonical for now.
- Preserve `analysis_json` field names: `id`, `snapshot`, `decision`, `scores`, `beforeApply`, `documents`, `eligibility`, `financials`, `technical`, `dates`, `risks`, `missingInformation`, `departmentQuestions`, and `proposalDraft`.
- Use FastAPI for a small, typed Python backend that can later host PDF extraction and AI analysis.
- Keep the backend path clean: routes call services, services call repositories.
- Do not add Gemini or PDF extraction in this foundation step.

## Commit Log

- 2026-06-13: Add FastAPI backend and database foundation.
- 2026-06-13: Add Postman API testing guide.
