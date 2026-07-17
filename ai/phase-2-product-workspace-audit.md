# Phase 2 product workspace audit

## Repository baseline

- Branch: `feat/electric-tender-entry`
- Starting commit: `8e188822bd0af0d81f4e6939b63b63ac8a38b36e`
- Baseline frontend lint: passed (`tsc --noEmit -p tsconfig.lint.json`)
- Baseline production build: passed (Next.js 16.2.9, 11 dynamic application routes)
- Backend tests: no test suite is present and `pytest` is not installed in the backend virtual environment.
- Existing working-tree items: Next.js changed `next-env.d.ts` to its development route-types import; the pre-existing untracked `postman/` directory is outside this phase and must remain untouched.

## Frontend route inventory

| Route | Current purpose | Electric Editorial status before Phase 2 | Principal gap |
| --- | --- | --- | --- |
| `/` | Approved entry, authentication transition, upload dock and local PDF preview | Approved | Preserve without redesign |
| `/login` | Reuses the approved entry with sign-in sheet open | Approved | Preserve |
| `/signup` | Reuses the approved entry with create-account sheet open | Approved | Preserve |
| `/upload` | Reuses the approved authenticated entry/upload scene | Approved | Preserve |
| `/dashboard` | Loads only the most recent tender or its full analysis | Legacy generic cards | No priority view, pipeline, recent tender controls or meaningful usage composition |
| `/history` | Loads all user-scoped tenders in a static table | Legacy generic table/card | No search, filtering, sorting, responsive library controls or updated-date field |
| `/pricing` | Loads backend plan metadata and checkout placeholder | Legacy equal pricing cards | Weak hierarchy, untranslated backend feature copy, no truthful payment-state composition |
| `/billing` | Loads current usage and plan | Legacy three-card SaaS layout | Hard-coded visible strings and zero-style placeholders; no coherent usage narrative |
| `/profile` | Shows account, usage, language and security summaries | Legacy card grid | Interface and analysis language are not presented separately; many untranslated strings |
| `/tender/[id]` | Loads one tender, exposes separate extraction and analysis buttons, then renders one long analysis column | Legacy generic cards | No unified state machine, workspace navigation, real stored-PDF viewer or laptop-efficient information architecture |
| `/_not-found` | 404 recovery | Legacy grey page | Hard-coded English and no approved visual language |

There are no route-level `loading.tsx` or `error.tsx` files. Protected-route loading and error states are component-local and visually inconsistent.

## Translation coverage

English, Hindi and Marathi dictionaries contain matching Phase 1 namespaces, but Phase 2 screens still contain hard-coded English in the dashboard pending-state copy, history table headings/status descriptions, pricing feature descriptions, billing usage values, profile/security/activity copy, all legacy analysis components, tender processing errors/actions and the not-found page. Original tender quotations and identifiers must remain unmodified; interface labels and explanations must move to dictionaries.

## Duplicated and obsolete UI

- Dashboard, history, billing, profile, pricing and not-found each repeat `Header + grey page + max-w-7xl` shells.
- Loading, warning and error boxes are reimplemented with unrelated Tailwind values.
- Plan/credit normalization and title casing are duplicated across Header, dashboard, pricing, billing and profile.
- Status/risk badge rules are duplicated between history and analysis components.
- `TenderAnalysisView` composes numerous legacy card components into one long column and owns a placeholder source viewer.
- `TenderService` still contains opt-in mock repositories and dated mock-history helpers; authenticated callers correctly leave fallback disabled, but the mock layer should not influence new product UI.

## Existing backend capabilities

- JWT authentication, password hashing, account lock handling and user-scoped current-user responses.
- User-owned tender upload with MIME/signature checks, 20 MB enforcement, daily upload quota and private Supabase Storage paths.
- User-scoped tender list/latest/detail reads and user-scoped writes for upload, extraction and analysis.
- Selectable-text extraction with `pypdf`, stored page text, page count and extracted-text preview.
- Structured AI analysis validated through Pydantic, stored in `analysis_json`, with summary fields copied to the tender row.
- Analysis credits are checked and consumed only after successful analysis persistence.
- Backend-controlled upload, extraction and analysis rate limits plus usage/audit events.
- Billing usage, backend plan metadata and a truthful `payments_enabled: false` checkout placeholder.
- Interface and analysis-language preference fields plus an authenticated preference update endpoint.

## Missing or unfinished backend capabilities

- The implementation does **not** currently perform OCR. It detects the absence of selectable text only after extraction. The UI must not claim OCR ran; it may report that OCR is required/unavailable.
- Extraction responses do not expose extraction method, OCR usage or text coverage beyond `pages_with_text`.
- No endpoint issues a short-lived signed URL for the stored private PDF.
- Processing is synchronous and has no job/status endpoint or page-level progress. The frontend can show completed stages plus an indeterminate active stage only.
- Stored tender status is coarse (`uploaded`, `extracted`, `analyzed`, `failed`, `upload_failed`) and does not distinguish extraction failure from analysis failure except by retained page data.
- Existing analysis JSON has no `schema_version`; compatibility must default old records to version 1.
- No Ask TenderMate endpoint, evidence attachment API, delete-account workflow, billing history or live payment integration exists.
- Tender list API has no server-side search/filter/sort/pagination contract; client filtering is acceptable for the current small dataset but should not be presented as server pagination.

## Security findings

- Tender reads and writes consistently add both tender ID and authenticated user ID in Supabase queries.
- Service-role and model credentials remain backend configuration only. Frontend uses the application bearer token and never accesses private Supabase tables directly.
- The service worker ignores `/api`, authorization-bearing requests and uploaded files; raw PDFs and private responses are not cached.
- Logout clears private SWR keys, and local PDF object URLs are revoked by the approved preview implementation.
- Private source-PDF access is missing rather than insecure. It must be added through a user-scoped backend lookup and a short-lived signed URL.
- Rate limits are process-memory only, so they are not globally consistent across multiple backend workers or instances. A shared limiter is a future production requirement.
- Supabase Storage bucket privacy and RLS policies cannot be proven from repository code; deployment must verify the `tender-pdfs` bucket is private and table policies remain user-safe.
- Backend mock data is returned only when Supabase is entirely unconfigured. Production must fail closed on missing configuration and must never enable frontend mock fallbacks for authenticated pages.

## Phase 2 implementation boundary

Preserve the approved entry routes. Introduce one shared authenticated/editorial shell, real-data dashboard and library views, a typed processing state machine, a tabbed tender workspace, version-tolerant structured analysis types and a user-scoped signed-source endpoint. Represent OCR, evidence uploads, Ask TenderMate, billing history and payments as unavailable/coming next unless a real contract exists; never simulate them.
