# TenderMate AI Postman Testing Guide

This guide explains how to run the FastAPI backend locally and test the current mock API endpoints with Postman.

Current scope:

- FastAPI local backend testing only.
- No Supabase integration yet.
- No Gemini analysis yet.
- No PDF extraction or file storage yet.

## 1. Open Backend Folder

Open Windows CMD and move to the backend folder:

```bat
cd /d E:\TenderMate-AI\backend
```

If the project is in another location, replace `E:\TenderMate-AI` with your local project path.

## 2. Activate Backend Virtual Environment

If the virtual environment already exists:

```bat
venv\Scripts\activate.bat
```

After activation, CMD should show `(venv)` before the prompt.

If the virtual environment does not exist yet, create it first:

```bat
python -m venv venv
venv\Scripts\activate.bat
```

## 3. Install Backend Dependencies

With `(venv)` active, install the Python packages:

```bat
python -m pip install --upgrade pip
pip install -r requirements.txt
```

The dependencies include FastAPI, Uvicorn, python-dotenv, python-multipart, and Supabase client libraries. Supabase credentials are not required for the current mock API test.

## 4. Run FastAPI With Uvicorn

Run the backend from the `backend` folder:

```bat
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Expected CMD output includes:

```text
Uvicorn running on http://127.0.0.1:8000
```

Keep this CMD window open while testing in Postman.

## 5. Open Swagger UI

Open this URL in a browser:

```text
http://127.0.0.1:8000/docs
```

Swagger UI should show these route groups:

- `health`
- `tenders`
- `uploads`

This is also useful for confirming request methods and response schemas before testing in Postman.

## 6. Postman Setup

Create a new Postman collection named:

```text
TenderMate AI Backend API Testing
```

Optional collection variable:

```text
base_url = http://127.0.0.1:8000
```

If using the variable, write request URLs as:

```text
{{base_url}}/health
```

Otherwise, use the full URLs shown below.

## 7. API Test Cases

### 7.1 Health Check

| Field | Value |
| --- | --- |
| Method | `GET` |
| URL | `http://127.0.0.1:8000/health` |
| Purpose | Confirm that the FastAPI backend is running. |
| Expected status | `200 OK` |

Expected response:

```json
{
  "status": "ok",
  "service": "TenderMate AI Backend"
}
```

Postman steps:

1. Create a new request.
2. Select `GET`.
3. Enter `http://127.0.0.1:8000/health`.
4. Click `Send`.
5. Confirm status `200 OK` and the JSON response above.

### 7.2 List Tenders

| Field | Value |
| --- | --- |
| Method | `GET` |
| URL | `http://127.0.0.1:8000/api/v1/tenders` |
| Purpose | Return the current mock tender list. |
| Expected status | `200 OK` |

Expected response:

```json
[
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "title": "Mock Municipal Office Furniture Tender",
    "organization": "Demo Municipal Corporation",
    "category": "Office Supplies",
    "location": "Pune, Maharashtra",
    "deadline": "30 June 2026",
    "risk_level": "Medium",
    "fit_score": 72,
    "status": "uploaded",
    "analysis_json": {
      "id": "11111111-1111-1111-1111-111111111111",
      "snapshot": {
        "title": "Mock Municipal Office Furniture Tender",
        "tenderId": "TMAI/MOCK/2026/001",
        "organization": "Demo Municipal Corporation",
        "location": "Pune, Maharashtra",
        "category": "Office Supplies",
        "estimatedValue": "Rs 12 Lakh",
        "emdAmount": "Rs 24,000",
        "submissionDeadline": "30 June 2026",
        "contractDuration": "30 days"
      },
      "decision": {
        "shouldApply": "Review",
        "recommendation": "Placeholder analysis only. Full AI analysis will be added later.",
        "overallFitScore": 72,
        "riskLevel": "Medium",
        "deadlineUrgency": "Medium",
        "missingCriticalRequirements": 1
      },
      "scores": [
        {
          "label": "Overall Fit",
          "value": 72,
          "display": "72%"
        },
        {
          "label": "Document Readiness",
          "value": 65,
          "display": "65%"
        }
      ],
      "beforeApply": [
        {
          "label": "Verify eligibility criteria",
          "status": "warning"
        },
        {
          "label": "Confirm EMD payment readiness",
          "status": "ready"
        }
      ],
      "documents": [],
      "eligibility": [],
      "financials": [],
      "technical": [],
      "dates": [
        {
          "label": "Last Submission Date",
          "date": "30 June 2026",
          "status": "upcoming"
        }
      ],
      "risks": [],
      "missingInformation": [
        "Original PDF extraction has not been implemented yet."
      ],
      "departmentQuestions": [
        "Can the department confirm delivery location and warranty terms?"
      ],
      "proposalDraft": "This is a placeholder proposal draft for backend testing."
    },
    "created_at": "dynamic timestamp",
    "updated_at": "dynamic timestamp"
  }
]
```

Notes:

- `created_at` and `updated_at` are generated when the backend starts, so their exact values will vary.
- The endpoint currently returns mock data from the repository layer.

Postman steps:

1. Create a new request.
2. Select `GET`.
3. Enter `http://127.0.0.1:8000/api/v1/tenders`.
4. Click `Send`.
5. Confirm status `200 OK`.
6. Confirm the response is a JSON array containing the mock tender.

### 7.3 Latest Tender

| Field | Value |
| --- | --- |
| Method | `GET` |
| URL | `http://127.0.0.1:8000/api/v1/tenders/latest` |
| Purpose | Return the latest available mock tender. |
| Expected status | `200 OK` |

Expected response:

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "title": "Mock Municipal Office Furniture Tender",
  "organization": "Demo Municipal Corporation",
  "category": "Office Supplies",
  "location": "Pune, Maharashtra",
  "deadline": "30 June 2026",
  "risk_level": "Medium",
  "fit_score": 72,
  "status": "uploaded",
  "analysis_json": {
    "id": "11111111-1111-1111-1111-111111111111",
    "snapshot": {
      "title": "Mock Municipal Office Furniture Tender",
      "tenderId": "TMAI/MOCK/2026/001"
    },
    "decision": {
      "shouldApply": "Review",
      "overallFitScore": 72,
      "riskLevel": "Medium"
    }
  },
  "created_at": "dynamic timestamp",
  "updated_at": "dynamic timestamp"
}
```

Notes:

- The actual `analysis_json` includes the full placeholder frontend-compatible analysis object.
- The sample above is shortened for readability.

Postman steps:

1. Create a new request.
2. Select `GET`.
3. Enter `http://127.0.0.1:8000/api/v1/tenders/latest`.
4. Click `Send`.
5. Confirm status `200 OK`.
6. Confirm the response contains the mock tender ID.

### 7.4 Tender Detail by ID

| Field | Value |
| --- | --- |
| Method | `GET` |
| URL | `http://127.0.0.1:8000/api/v1/tenders/11111111-1111-1111-1111-111111111111` |
| Purpose | Return one tender by UUID. |
| Expected status | `200 OK` |

Expected response:

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "title": "Mock Municipal Office Furniture Tender",
  "organization": "Demo Municipal Corporation",
  "category": "Office Supplies",
  "location": "Pune, Maharashtra",
  "deadline": "30 June 2026",
  "risk_level": "Medium",
  "fit_score": 72,
  "status": "uploaded",
  "analysis_json": {
    "id": "11111111-1111-1111-1111-111111111111"
  },
  "created_at": "dynamic timestamp",
  "updated_at": "dynamic timestamp"
}
```

Notes:

- The actual `analysis_json` includes the full placeholder analysis object.
- The path parameter must be a valid UUID.

Postman steps:

1. Create a new request.
2. Select `GET`.
3. Enter `http://127.0.0.1:8000/api/v1/tenders/11111111-1111-1111-1111-111111111111`.
4. Click `Send`.
5. Confirm status `200 OK`.
6. Confirm the returned `id` matches the ID in the URL.

### 7.5 Upload Tender Placeholder

| Field | Value |
| --- | --- |
| Method | `POST` |
| URL | `http://127.0.0.1:8000/api/v1/tenders/upload` |
| Purpose | Test the upload placeholder route. It records request metadata only. |
| Expected status | `202 Accepted` |

Recommended headers:

| Header | Value |
| --- | --- |
| `x-file-name` | `sample-tender.pdf` |
| `Content-Type` | `application/pdf` |

Recommended body:

- In Postman, select `Body`.
- Select `binary`.
- Choose any sample PDF.

Expected response:

```json
{
  "id": "generated upload UUID",
  "tender_id": "11111111-1111-1111-1111-111111111111",
  "file_name": "sample-tender.pdf",
  "file_size": 12345,
  "mime_type": "application/pdf",
  "storage_bucket": null,
  "storage_path": null,
  "pdf_url": null,
  "created_at": "dynamic timestamp",
  "status": "accepted",
  "message": "Upload endpoint is wired with a placeholder response. PDF extraction and AI analysis are not enabled yet."
}
```

Notes:

- `id` is generated for every upload request.
- `file_size` depends on the selected file and can be `null` if no `Content-Length` header is sent.
- `storage_bucket`, `storage_path`, and `pdf_url` are `null` because file storage is not implemented yet.
- The endpoint does not extract PDFs or run AI analysis yet.

Postman steps:

1. Create a new request.
2. Select `POST`.
3. Enter `http://127.0.0.1:8000/api/v1/tenders/upload`.
4. Add header `x-file-name: sample-tender.pdf`.
5. Add header `Content-Type: application/pdf`.
6. In `Body`, choose `binary` and select a sample PDF.
7. Click `Send`.
8. Confirm status `202 Accepted`.
9. Confirm response `status` is `accepted`.

## 8. Common Errors

### 8.1 `404 Not Found` on `/`

Request:

```text
GET http://127.0.0.1:8000/
```

Expected status:

```text
404 Not Found
```

Reason:

The backend does not currently define a root route. This is normal. Use `/health` or `/docs` to confirm the backend is running.

### 8.2 `422 Unprocessable Entity` When Calling Upload With `GET`

Incorrect request:

```text
GET http://127.0.0.1:8000/api/v1/tenders/upload
```

Expected status:

```text
422 Unprocessable Entity
```

Reason:

The upload endpoint only supports `POST`. With `GET`, FastAPI matches `upload` as the `{id}` value for `GET /api/v1/tenders/{id}` and then fails UUID validation.

Correct request:

```text
POST http://127.0.0.1:8000/api/v1/tenders/upload
```

### 8.3 `422 Unprocessable Entity` for Invalid Tender ID

Incorrect request:

```text
GET http://127.0.0.1:8000/api/v1/tenders/not-a-uuid
```

Expected status:

```text
422 Unprocessable Entity
```

Reason:

The `{id}` path parameter must be a valid UUID.

Correct example:

```text
GET http://127.0.0.1:8000/api/v1/tenders/11111111-1111-1111-1111-111111111111
```

### 8.4 `404 Not Found` for Valid UUID That Does Not Exist

Request:

```text
GET http://127.0.0.1:8000/api/v1/tenders/22222222-2222-2222-2222-222222222222
```

Expected status:

```text
404 Not Found
```

Expected response:

```json
{
  "detail": "Tender 22222222-2222-2222-2222-222222222222 was not found."
}
```

Reason:

The UUID format is valid, but the mock repository only contains the tender ID `11111111-1111-1111-1111-111111111111`.

## 9. Screenshot Checklist for College Submission

Capture these screenshots after the backend is running:

- CMD showing `(venv)` activated.
- CMD showing `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`.
- Browser showing Swagger UI at `http://127.0.0.1:8000/docs`.
- Postman `GET /health` with `200 OK`.
- Postman `GET /api/v1/tenders` with `200 OK`.
- Postman `GET /api/v1/tenders/latest` with `200 OK`.
- Postman `GET /api/v1/tenders/{id}` using `11111111-1111-1111-1111-111111111111` with `200 OK`.
- Postman `POST /api/v1/tenders/upload` with `202 Accepted`.
- Optional: Postman `GET /` showing `404 Not Found` and a note that no root route exists.
- Optional: Postman invalid UUID request showing `422 Unprocessable Entity`.
- Optional: Postman valid missing UUID request showing `404 Not Found`.

Recommended submission note:

```text
The backend was tested locally using FastAPI, Uvicorn, Swagger UI, and Postman. The current endpoints return mock data and placeholder upload responses. Supabase storage, PDF extraction, and Gemini AI analysis are planned future steps.
```
