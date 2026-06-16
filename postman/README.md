# TenderMate AI Production Postman Collection

This folder contains a clean Postman collection and environment for testing the deployed FastAPI backend on Render.

Files:

- `TenderMate_AI_Production.postman_collection.json`
- `TenderMate_AI_Production.postman_environment.json`

## Setup

1. Open Postman.
2. Import `TenderMate_AI_Production.postman_collection.json`.
3. Import `TenderMate_AI_Production.postman_environment.json`.
4. Select the `TenderMate AI Production` environment.
5. Run `Public / GET Health` first.

Render free services may take 30-60 seconds to wake up. If the first request times out, wait and retry.

## Authentication

Run `Auth / POST Signup` or `Auth / POST Login`.

If the response includes a JWT, the collection test script automatically saves it to the `access_token` environment variable. If the response includes `user.id`, it saves that value to `user_id`.

Protected requests use:

```text
Bearer {{access_token}}
```

Do not save real JWT tokens, API keys, or other secrets in the collection files.

## PDF Upload

`Tenders / POST Upload Tender PDF` uses form-data with a `file` field.

Before sending the request, select a PDF manually in Postman. The collection intentionally leaves the file value blank so no local file path is committed.

When upload succeeds, the test script saves:

- `tender_id`
- `upload_id`

## Correct Testing Order

1. Health
2. Signup
3. Login
4. Auth Me
5. Billing Usage
6. Upload Tender PDF
7. Extract PDF Text
8. Analyze with Gemini
9. Get Tender Detail After Analysis

## Common Errors

- `401`: missing or expired JWT. Run Signup or Login again.
- `402`: free analysis credits are used up.
- `413`: uploaded PDF is too large.
- `429`: rate limit or quota exceeded.
- `500`: backend environment or server issue.

Render free service wake-up can also make early requests slow for 30-60 seconds.
