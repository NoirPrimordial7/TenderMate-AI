# TenderMate AI

TenderMate AI is a production MVP for MSMEs to manage tender readiness. It combines a Next.js frontend, FastAPI backend, JWT authentication, and Supabase PostgreSQL so users can sign up, log in, and view protected tender history.

Live URLs:

- Frontend: https://tender-mate-ai.vercel.app
- Backend: https://tendermate-ai-backend.onrender.com
- Backend health: https://tendermate-ai-backend.onrender.com/health
- Backend API base: https://tendermate-ai-backend.onrender.com/api/v1

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, Python, PyJWT, pwdlib Argon2 password hashing
- Database: Supabase PostgreSQL
- Deployment: Vercel frontend, Render backend

## Completed Features

- JWT signup, login, logout, and `/auth/me`
- Protected dashboard, history, upload, and tender detail flows
- Supabase-backed tender reads scoped by logged-in user
- Placeholder upload flow for MVP demos
- Production CORS configuration through `FRONTEND_URL` and `CORS_ORIGINS`
- Deployment guide and production testing checklist

## Planned Next

- Real PDF upload with Supabase Storage
- PDF text extraction
- Gemini-powered tender analysis
- Persist generated analysis reports to user history

## Local Setup

Install frontend dependencies:

```bash
npm install
```

Create `.env.local` in the repository root:

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Install backend dependencies:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env` from `backend/.env.example` and fill in Supabase and JWT values.

Run the backend:

```bash
cd backend
python -m uvicorn app.main:app
```

Run the frontend:

```bash
npm run dev
```

## Deployment Summary

- Deploy the FastAPI backend first.
- Set backend secrets only on the backend host.
- Set frontend `NEXT_PUBLIC_API_BASE_URL` to the deployed backend URL plus `/api/v1`.
- Set backend `FRONTEND_URL` or `CORS_ORIGINS` to the deployed Vercel URL.

Backend secrets are not exposed to the frontend. Never put `SUPABASE_SERVICE_ROLE_KEY` or `JWT_SECRET_KEY` in frontend environment variables.
