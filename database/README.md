# TenderMate AI Database

This folder contains the Supabase/PostgreSQL foundation for the MVP backend.

## Files

- `schema.sql` creates the `tenders` and `uploads` tables, indexes, and the `updated_at` trigger.
- `seed.sql` inserts mock tender records that keep `analysis_json` compatible with the current frontend schema.
- `migrations/20260717_add_ai_model_foundation.sql` adds provider-neutral model runs, reviewed training-example candidates, field feedback, constraints, indexes, and RLS. Apply it before enabling self-hosted fallback or shadow traffic.

## Local Supabase Setup

1. Open the Supabase SQL editor.
2. Run `schema.sql`.
3. Run `seed.sql` if mock data is needed.
4. Copy Supabase credentials into `backend/.env` based on `backend/.env.example`.

The backend is prepared to create a Supabase client from environment variables, but the current API routes return mock data and do not require real credentials yet.
