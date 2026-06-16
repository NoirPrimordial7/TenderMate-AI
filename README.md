# TenderMate AI

TenderMate AI is a production MVP for MSMEs to manage tender readiness. It combines a Next.js frontend, FastAPI backend, JWT authentication, Supabase PostgreSQL, and Supabase Storage so users can sign up, log in, upload tender PDFs, and view protected tender history.

Live URLs:

- Frontend: https://tender-mate-ai.vercel.app
- Backend: https://tendermate-ai-backend.onrender.com
- Backend health: https://tendermate-ai-backend.onrender.com/health
- Backend API base: https://tendermate-ai-backend.onrender.com/api/v1

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, Python, PyJWT, pwdlib Argon2 password hashing
- Database and storage: Supabase PostgreSQL and private Supabase Storage
- Deployment: Vercel frontend, Render backend

## Completed Features

- JWT signup, login, logout, and `/auth/me`
- Protected dashboard, history, upload, and tender detail flows
- Supabase-backed tender reads scoped by logged-in user
- Real PDF upload to private Supabase Storage bucket `tender-pdfs`
- User-linked tender and upload records for uploaded PDFs
- PDF text extraction foundation with page-wise text stored in Supabase
- Free trial foundation with 5 tender AI analyses per new user
- Profile/account area with plan, credits, billing status, and account actions
- Pricing and billing pages with upgrade-required UI
- Billing usage/plans/checkout placeholder API
- Rate limits for auth, upload, and billing APIs
- Daily upload quotas for tender PDFs
- Failed-login account lockout
- Audit logs for auth, upload, and billing events
- Production CORS configuration through `FRONTEND_URL` and `CORS_ORIGINS`
- Deployment guide and production testing checklist

## Trial and Payments

Every new user starts with 5 free tender analyses. The profile, billing, and pricing pages show the current plan, credits left, subscription status, and usage summary. The pricing page shows Free, Starter, Pro, and Business plans.

Payments are planned with Razorpay, but live payments are not enabled yet. The current implementation is a foundation only: it tracks trial credits, exposes billing endpoints, and returns a friendly coming-soon checkout response.

## Planned Next

- Gemini-powered tender analysis
- Razorpay payment integration
- Persist generated analysis reports to user history

## Security Highlights

- APIs use JWT bearer authentication.
- Tender history and upload metadata are scoped to the logged-in user.
- PDFs are stored privately in Supabase Storage at `users/{user_id}/tenders/{tender_id}/original.pdf`.
- The Supabase service role key is used only by the backend and is never exposed to the frontend.
- Every user receives 5 free analysis credits.
- Auth, upload, and billing endpoints have MVP in-memory rate limits.
- PDF uploads are capped at 5 per user per day.
- Security-sensitive events are recorded in `audit_logs`.

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
