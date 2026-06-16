# TenderMate AI Postman Testing Guide

This guide tests the current FastAPI backend with Supabase-backed auth, JWT bearer tokens, user-scoped tender history, real PDF uploads to Supabase Storage, and PDF text extraction.

Current scope:

- FastAPI local backend testing.
- Supabase PostgreSQL required for auth.
- Private Supabase Storage bucket `tender-pdfs` required for PDF upload.
- Tender APIs are protected and user-specific.
- No Gemini analysis yet.

## 1. Backend Setup

Open Windows CMD and move to the backend folder:

```bat
cd /d E:\TenderMate-AI\backend
```

Activate the virtual environment:

```bat
venv\Scripts\activate.bat
```

Install dependencies:

```bat
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create `backend/.env` from `backend/.env.example` and set:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
FRONTEND_URL=http://localhost:3000
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Generate `JWT_SECRET_KEY` locally and never commit `backend/.env`. `SUPABASE_SERVICE_ROLE_KEY` is backend-only and must never be exposed to the frontend.

Run the backend:

```bat
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Swagger UI should be available at:

```text
http://127.0.0.1:8000/docs
```

## 2. Postman Setup

Create a collection named:

```text
TenderMate AI Backend API Testing
```

Recommended collection variables:

```text
base_url = http://127.0.0.1:8000
access_token =
tender_id =
```

For protected requests, set the Authorization tab to:

```text
Type: Bearer Token
Token: {{access_token}}
```

## 3. Full Testing Flow

### 3.1 Health Check

```text
GET {{base_url}}/health
```

Expected status: `200 OK`

Expected response:

```json
{
  "status": "ok",
  "service": "TenderMate AI Backend"
}
```

### 3.2 Signup

```text
POST {{base_url}}/api/v1/auth/signup
Content-Type: application/json
```

Body:

```json
{
  "full_name": "Postman Test User",
  "email": "postman.user@tendermate.ai",
  "password": "ChangeThisPassword123"
}
```

Expected status: `201 Created`

Copy `access_token` from the response into the Postman `access_token` collection variable.

Note: `database/seed.sql` includes a demo user with a placeholder password hash for ownership links. Real test users should be created through `/api/v1/auth/signup`.

### 3.3 Login

```text
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "postman.user@tendermate.ai",
  "password": "ChangeThisPassword123"
}
```

Expected status: `200 OK`

Copy the returned `access_token` into the Postman `access_token` collection variable.

### 3.4 Current User

```text
GET {{base_url}}/api/v1/auth/me
Authorization: Bearer {{access_token}}
```

Expected status: `200 OK`

Expected response includes:

```json
{
  "email": "postman.user@tendermate.ai",
  "role": "msme_user",
  "is_active": true
}
```

### 3.5 List Tenders

```text
GET {{base_url}}/api/v1/tenders
Authorization: Bearer {{access_token}}
```

Expected status: `200 OK`

Expected response is an array of tenders belonging only to the logged-in user. A newly signed-up user may receive an empty array:

```json
[]
```

If rows exist, copy one `id` into the Postman `tender_id` collection variable.

### 3.6 Latest Tender

```text
GET {{base_url}}/api/v1/tenders/latest
Authorization: Bearer {{access_token}}
```

Expected status:

- `200 OK` when the current user has at least one tender.
- `404 Not Found` when the current user has no tenders.

### 3.7 Tender Detail

```text
GET {{base_url}}/api/v1/tenders/{{tender_id}}
Authorization: Bearer {{access_token}}
```

Expected status:

- `200 OK` when the tender exists and belongs to the current user.
- `404 Not Found` when the tender does not exist or belongs to another user.

### 3.8 Real PDF Upload

```text
POST {{base_url}}/api/v1/tenders/upload
Authorization: Bearer {{access_token}}
```

Body: choose `form-data`, add key `file`, set the key type to `File`, and select a sample PDF.

Expected status: `201 Created`

Expected response includes:

```json
{
  "upload_id": "<uuid>",
  "tender_id": "<uuid>",
  "file_name": "sample-tender.pdf",
  "storage_bucket": "tender-pdfs",
  "storage_path": "users/<user_id>/tenders/<tender_id>/original.pdf",
  "status": "uploaded"
}
```

The endpoint stores the PDF in Supabase Storage and creates user-owned tender/upload metadata. Copy `tender_id` into the Postman `tender_id` collection variable to test extraction.

### 3.9 PDF Text Extraction

```text
POST {{base_url}}/api/v1/tenders/{{tender_id}}/extract
Authorization: Bearer {{access_token}}
```

Expected status: `200 OK`

Expected response includes:

```json
{
  "tender_id": "<uuid>",
  "status": "extracted",
  "page_count": 12,
  "pages_with_text": 11
}
```

If the PDF is scanned and has no selectable text, the endpoint can still return `200 OK` with `pages_with_text: 0`.

## 4. Common Errors

### 4.1 `401 Unauthorized` Missing Token

Request a protected endpoint without Authorization:

```text
GET {{base_url}}/api/v1/tenders
```

Expected response:

```json
{
  "detail": "Missing bearer token."
}
```

### 4.2 `401 Unauthorized` Invalid Token

Use an invalid bearer token:

```text
Authorization: Bearer invalid-token
```

Expected response:

```json
{
  "detail": "Invalid or expired access token."
}
```

### 4.3 `403 Forbidden` Inactive User

If `public.app_users.is_active` is set to `false`, login or `/auth/me` should return:

```json
{
  "detail": "User account is inactive."
}
```

### 4.4 `409 Conflict` Email Already Exists

Signup with an existing email:

```json
{
  "detail": "Email already exists."
}
```

### 4.5 `404 Not Found` Tender Not Owned By Current User

Request a valid tender UUID that does not belong to the current user:

```json
{
  "detail": "Tender <id> was not found or does not belong to the current user."
}
```

### 4.6 `422 Unprocessable Entity` Invalid Tender ID

Request:

```text
GET {{base_url}}/api/v1/tenders/not-a-uuid
```

The `{id}` path parameter must be a valid UUID.

## 5. Screenshot Checklist

- CMD showing `(venv)` activated.
- CMD showing `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.
- Browser showing Swagger UI at `http://127.0.0.1:8000/docs`.
- Postman `POST /api/v1/auth/signup`.
- Postman `POST /api/v1/auth/login`.
- Postman `GET /api/v1/auth/me` with bearer token.
- Postman `GET /api/v1/tenders` with bearer token.
- Postman `GET /api/v1/tenders/latest` with bearer token.
- Postman `GET /api/v1/tenders/{id}` with bearer token when a user-owned tender exists.
- Postman `POST /api/v1/tenders/upload` with bearer token.
- Postman `POST /api/v1/tenders/{id}/extract` with bearer token.

Recommended submission note:

```text
The backend was tested locally using FastAPI, Uvicorn, Swagger UI, Supabase PostgreSQL, Supabase Storage, JWT authentication, and Postman. Tender history, upload metadata, and extracted page text are scoped to the logged-in user. Gemini AI analysis is a planned future step.
```
