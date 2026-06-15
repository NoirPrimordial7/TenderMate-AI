# TenderMate AI Deployment Guide

This guide prepares the current MVP for deployment with:

- Next.js frontend on Vercel
- FastAPI backend on Render or Railway
- Supabase PostgreSQL database

Current production URLs:

- Frontend: https://tender-mate-ai.vercel.app
- Backend: https://tendermate-ai-backend.onrender.com
- Backend API: https://tendermate-ai-backend.onrender.com/api/v1
- Backend health: https://tendermate-ai-backend.onrender.com/health

Do not commit `.env.local`, `backend/.env`, Supabase keys, JWT secrets, virtual environments, cache folders, or runtime export files.

## A. Supabase

1. Open the Supabase project dashboard.
2. Go to the SQL editor.
3. Run `database/schema.sql`.
4. Confirm these tables exist:
   - `app_users`
   - `tenders`
   - `uploads`
5. Keep these values ready for backend deployment:
   - Supabase project URL
   - Supabase anon key
   - Supabase service role key

Never expose the Supabase service role key in the frontend. It belongs only in the FastAPI backend environment.

## B. Backend Deployment

Recommended services: Render or Railway.

Service settings:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

For local testing, this still works from `backend/`:

```bash
python -m uvicorn app.main:app
```

Production environment variables:

```text
PROJECT_NAME=TenderMate AI Backend
FRONTEND_URL=https://tender-mate-ai.vercel.app
CORS_ORIGINS=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Use a strong generated value for `JWT_SECRET_KEY`. Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only.

If you need to allow more than one frontend origin, set `CORS_ORIGINS` as a comma-separated list:

```text
CORS_ORIGINS=https://your-custom-domain.com,https://your-preview-domain.vercel.app
```

Do not use `*` for CORS while credentials and auth headers are used.

## C. Frontend Deployment

Recommended service: Vercel.

Vercel settings:

- Project root: repository root
- Build command: `npm run build`
- Environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://tendermate-ai-backend.onrender.com/api/v1
```

Deployment order:

1. Deploy the backend first.
2. Open `https://tendermate-ai-backend.onrender.com/health` and confirm it returns `status: ok`.
3. Set `NEXT_PUBLIC_API_BASE_URL` in Vercel to the backend URL plus `/api/v1`.
4. Deploy the frontend.
5. Copy the deployed frontend URL.
6. Update backend `FRONTEND_URL` or `CORS_ORIGINS` with the deployed frontend URL.
7. Redeploy or restart the backend after changing backend environment variables.

The frontend only receives `NEXT_PUBLIC_API_BASE_URL`. Supabase keys, service role key, and JWT secret stay in the backend.

## D. Final Production Testing Checklist

- Open backend `/health`.
- Open frontend live URL.
- Signup creates a user and stores a JWT.
- Login returns a JWT.
- `GET /api/v1/auth/me` works with `Authorization: Bearer <token>`.
- Dashboard requires login.
- History requires login.
- Logout clears access.
- Protected APIs without a token return `401 Unauthorized`.
- Protected APIs with a valid token work.
- Tender history only shows records for the logged-in user.
- Supabase `app_users` contains the new user.
- Browser console has no CORS errors.
- No secrets are committed.

## E. Common Errors

- CORS error: backend `FRONTEND_URL` or `CORS_ORIGINS` does not include the deployed frontend URL.
- `401 Unauthorized`: missing, invalid, or expired JWT token.
- `500 Internal Server Error`: backend environment variables may be missing or invalid.
- Supabase error: check Supabase URL, service role key, table names, and whether `schema.sql` was run.
- Vercel frontend cannot call `localhost` in production. `NEXT_PUBLIC_API_BASE_URL` must point to the deployed FastAPI backend URL plus `/api/v1`.
