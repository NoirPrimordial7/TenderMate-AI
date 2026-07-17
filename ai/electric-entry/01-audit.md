# Electric entry audit

## Product and user

- Page type: authenticated product-entry workspace, not a marketing landing page.
- Audience: Indian MSME owners and bid teams who need a fast read on tender eligibility, documents, risks, and deadlines.
- Primary task: sign in or create an account, then upload one tender PDF.
- Tone required: decisive, technically credible, high-contrast, and premium without becoming decorative or obscure.
- Content density: compact. One stage, one document engine, one control dock.
- Motion tolerance: high for the first reveal and low-frequency state changes; low for frequent form and upload controls.

## Why the previous warm-paper redesign fails visually

The `feat/entry-workspace-redesign` direction is functionally stronger than `master`, but it is the wrong visual answer for this brief.

1. The warm beige background, emerald accent, soft paper grain, rounded white surfaces, and calm editorial type create a healthcare, insurance, or compliance-service association.
2. The headline is deliberately modest and sits in a conventional left-column composition. It informs, but it does not command the first viewport.
3. The three small icon outcomes create a familiar SaaS feature-list rhythm. They fragment the story instead of making the document engine the product.
4. The layered paper illustration is centered below the copy and reads as a friendly explainer graphic, not a powered intelligence object.
5. The functional panel is a conventional elevated card beside text. Its form controls are polished but visually detached from the hero system.
6. Motion is limited to small fades, a scanner loop, and a tab slide. The scene does not choreograph typography, object, and control state as one event.
7. The overall contrast range is narrow. There is no spotlight, sharp data layer, or strong silhouette to make the experience memorable.

Keep from that work: reusable forms, safe redirect handling, accessible menus, real user usage values, file replace/remove actions, XHR byte progress, cancellation, and reduced-motion handling. Replace its entire visual hierarchy and scene composition.

## `master` starting-point audit

### Authentication flow

- `AuthProvider` restores `tendermate.access_token` and `tendermate.current_user` from local storage.
- With a stored token it calls `GET /auth/me`; a 401 clears the session and dispatches `tendermate:auth-invalidated`.
- `POST /auth/login` accepts `{ email, password }` and returns `{ access_token, token_type, user }`.
- `POST /auth/signup` accepts `{ full_name, email, password }` and returns the same session shape with HTTP 201.
- Login and signup pages duplicate form state, validation, errors, markup, and redirect behavior.
- Current `/login` and `/signup` redirect authenticated users to `/dashboard`. The `next` query used by protected routes is not actually read on `master`, which is a confirmed redirect bug.

### Upload flow

- `UploadCard` validates a PDF by MIME type or `.pdf` extension and caps selection at 20 MB.
- Authenticated uploads send `FormData` with field name `file` to `POST /tenders/upload` with the bearer token supplied by `apiRequest`.
- The upload response contains `tender_id`, `message`, file/storage metadata, and status.
- Success waits 750 ms then routes to `/tender/{tender_id}`.
- The backend independently validates non-empty PDF input, 20 MB maximum, bearer ownership, and the daily quota.
- `master` uses fetch and exposes no upload bytes, cancellation, replace, or remove action. An upload-specific XHR transport can add these without changing the backend contract.
- OCR and Gemini analysis are separate later actions (`/extract`, `/analyze`) and must not be represented as upload progress.

### Duplicated UI logic

- Login and signup pages duplicate fields, error containers, submit states, and layout.
- The homepage and `/upload` duplicate the same `Header + UploadCard` shell.
- Usage/credit presentation is repeated in `Header` and `UploadCard`.
- File input behavior, errors, selection presentation, and upload action are tightly coupled inside one large component.

### Responsive weaknesses

- Header labels are hidden at smaller widths instead of providing a real mobile menu.
- Profile menu has no viewport-aware width, outside-click dismissal, Escape handling, or focus management.
- Touch targets are frequently 36 px instead of the required 44 px.
- Homepage is a small centered card inside a large empty screen and has no authored mobile composition.
- Long names, errors, and menu content can compete with navigation width.

### Accessibility weaknesses

- Login/signup inputs have labels but no required semantics, password visibility control, or explicit live region for API errors.
- Header has no active-route state and menus are not fully keyboard operable.
- Upload dropzone depends on a label wrapper and gives limited screen-reader guidance.
- Upload progress is only an indeterminate spinner; errors and success are not explicitly live.
- Focus styles are inconsistent and largely browser/default Tailwind rings.

### Hard-coded plan and credit fallbacks

- `Header.tsx` falls back to 5 credits when the user response lacks usage fields.
- `UploadCard.tsx` also falls back to 5 credits and treats missing usage data as analysis access.
- Edited entry/header components must display “unavailable” when server values are absent, never fabricate usage.

### Reuse and split decisions

Reuse unchanged:

- `AuthContext` session lifecycle and public method signatures.
- `AuthService` request contracts.
- `TenderService` and `BackendTenderRepository` public responsibilities.
- `AuthUser`, `AuthSession`, and `UploadTenderResponse` types.
- App Router, protected routes, local token mechanism, and backend endpoints.

Split or replace:

- Replace `UploadCard` on entry routes with focused auth/upload dock components.
- Extract shared text/password fields and shared sign-in/sign-up forms.
- Separate file dropzone, selected file, upload status/progress, and account usage display.
- Replace the current header markup with an active-route, keyboard-accessible desktop/profile/mobile system.

## API contracts that must remain unchanged

- `POST /api/v1/auth/login` JSON body and `TokenResponse`.
- `POST /api/v1/auth/signup` JSON body and `TokenResponse`.
- `GET /api/v1/auth/me` bearer authentication and `UserResponse`.
- `POST /api/v1/tenders/upload` bearer authentication, multipart field `file`, HTTP 201 response, and `UploadResponse` shape.
- 20 MB client and backend validation.
- Daily quota error via HTTP 429.
- Successful redirect to `/tender/{tender_id}`.
- No direct client access to Supabase private tables or service-role credentials.

## Baseline quality gates

- `npm run lint`: passed on `master`.
- `npm run build`: passed on `master`; all 15 App Router pages generated successfully.

