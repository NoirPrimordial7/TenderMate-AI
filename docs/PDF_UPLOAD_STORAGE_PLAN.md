# PDF Upload Storage Plan

## Upload Flow

1. The logged-in user selects a PDF in the Next.js upload UI.
2. The frontend validates that the file is a PDF and no larger than 20 MB.
3. The frontend sends `multipart/form-data` to `POST /api/v1/tenders/upload` with the `file` field and the existing JWT bearer token.
4. FastAPI validates the file again, applies rate limits, checks the 5 uploads/day/user quota, and creates a user-owned `tenders` row with `status = 'uploaded'`.
5. The backend stores the PDF in Supabase Storage.
6. The backend creates a user-owned `uploads` row linked to the tender.
7. The backend records a `pdf_upload` usage event and an `upload_pdf` audit log.
8. The frontend redirects to the tender detail page, where the user can extract PDF text and then run AI analysis.

## Storage Bucket

- Bucket name: `tender-pdfs`
- Bucket visibility: private
- Storage path pattern: `users/{user_id}/tenders/{tender_id}/original.pdf`
- The backend stores `storage_bucket`, `storage_path`, file name, file size, MIME type, and nullable `pdf_url` in `public.uploads`.

## Security Checks

- JWT authentication is required.
- The Supabase service role key remains only in backend environment variables.
- The frontend does not write directly to Supabase Storage.
- Tender and upload rows are linked to `current_user.id`.
- Tender reads remain filtered by `tenders.user_id`.
- Upload usage is recorded only after Storage and metadata writes succeed.
- Audit logs record metadata only, not PDF contents.

## File Limits

- Allowed type: `application/pdf` or a filename ending in `.pdf`.
- Empty files are rejected.
- Maximum size: 20 MB.
- Invalid files return `400 Bad Request`.
- Files over 20 MB return `413 Payload Too Large`.
- Daily quota overages return `429 Too Many Requests`.

## User Ownership

Each upload creates a tender row and an upload row for the logged-in user. The storage path includes both `user_id` and `tender_id`, and the API never exposes another user's tenders or upload metadata.

## Next Step

PDF text extraction and Gemini analysis now use the private stored PDF and extracted page text. The next implementation phase is Razorpay payments or admin tooling.
