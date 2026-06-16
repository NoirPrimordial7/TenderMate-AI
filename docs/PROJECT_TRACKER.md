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
- Trial and billing foundation completed with configurable free AI analysis credits per user.
- Added billing usage/plans/checkout placeholder endpoints.
- Added frontend pricing page, trial usage badge, and upgrade-required UI.
- Security hardening and rate limiting foundation completed.
- Added failed-login lockout, upload quota checks, audit logs, and friendly security errors.
- Profile and billing UI polish completed with premium account, billing, pricing, upload, dashboard, and history surfaces.
- Added protected `/profile` and `/billing` pages.
- Real PDF upload with Supabase Storage completed for logged-in users.
- Added private `tender-pdfs` storage writes, user-owned tender/upload records, upload usage events, and `upload_pdf` audit logs.
- PDF text extraction foundation completed with page-wise `tender_pages` storage.
- Added protected `POST /api/v1/tenders/{id}/extract`, extraction status fields, and extraction pending UI.
- Gemini AI tender analysis completed using extracted `tender_pages`.
- Added protected `POST /api/v1/tenders/{id}/analyze`, strict JSON validation, source references, credit deduction after successful persistence, and analysis UI.

## In Progress

- No active blocker; Gemini analysis is ready for deployment validation.

## Next

- Razorpay payments or admin panel.
- Optional OCR for scanned PDFs.

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
- Store the frontend JWT in `localStorage` for the MVP and attach it as `Authorization: Bearer <token>`.
- Keep static frontend tender data as a development fallback only; authenticated pages should prefer the protected FastAPI API.
- New users receive 15 free AI analysis credits by default for demo/testing.
- Credits are deducted only after successful Gemini analysis persistence.
- Live Razorpay payments are not enabled in the billing foundation branch.
- Use in-memory rate limiting for the MVP; replace the store with Redis/Upstash later when traffic requires multi-instance limits.
- Keep PDF upload quotas separate from AI analysis credits.
- Store original PDFs in the private Supabase Storage bucket `tender-pdfs` at `users/{user_id}/tenders/{tender_id}/original.pdf`.
- Store extracted text page by page in `public.tender_pages` so Gemini analysis can cite source pages.
- Use backend-only Gemini credentials to create frontend-compatible `analysis_json` from extracted page text.

## Commit Log

- 2026-06-13: Add FastAPI backend and database foundation.
- 2026-06-13: Add Postman API testing guide.
- 2026-06-15: Connect frontend to JWT authentication.
- 2026-06-15: Add trial billing and usage limits foundation.
- 2026-06-15: Add security rate limits and quotas.
- 2026-06-15: Polish profile billing and premium UI.
- 2026-06-16: Add real PDF upload to Supabase Storage.
- 2026-06-16: Add PDF text extraction foundation.
- 2026-06-16: Add Gemini AI tender analysis.
