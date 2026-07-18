# NividaIQ Admin Console Audit

## Baseline and data sources

Audit performed against clean `origin/master` at `5fc0dc7`. Authentication authority is `public.app_users.password_hash` through FastAPI JWTs and the Supabase service-role client; Supabase Auth is not used. User, plan and analysis-credit state are in `app_users`; tender metadata/content are split across `tenders`, `uploads`, `tender_pages`; assistant activity is in `tender_chat_messages`; AI telemetry is in `ai_model_runs`; product feedback is in `product_feedback`; legal acceptance is in `user_legal_acceptances`; training consent is `app_users.training_consent`; usage and security-adjacent events are in `user_usage_events` and `audit_logs`; payments are placeholders only.

Tender customer repositories consistently add `user_id` ownership predicates. All admin browser traffic must instead use `/api/v1/admin`; the frontend has no Supabase client and no direct table access. The backend service-role client is configured only from `SUPABASE_SERVICE_ROLE_KEY`.

## Security baseline discrepancy

The supplied objective describes revocable sessions, RFC 6238 TOTP, recovery codes, recent-authentication, security notifications and Turnstile as current. Those implementations are not present on audited `master`: JWTs contain no session identifier, login creates no revocable session, `app_users` has no verified-email/MFA fields, and no TOTP, recovery-code, notification-outbox or Turnstile tables/services exist. Admin access is therefore implemented fail-closed: verified email, staff role, `mfa_enabled`, and a current unrevoked `app_sessions` record with `mfa_assured_at` are all mandatory. No header or JWT role claim is accepted as role authority. Deployment must connect the reviewed MFA flow to `app_sessions.mfa_assured_at` before staff can enter the console.

## Existing and required roles

Existing role representation is `app_users.role`, default `msme_user`. The migration extends that authority with `super_admin`, `admin`, `support`, `finance`, and `reviewer`; it does not create a second role store. Permission checks are server-side and deny with 403. `super_admin` controls staff roles and break-glass actions; `admin` handles normal accounts, plans, credits and sessions; `support` has lookup, feedback, notes and safe revocation; `finance` has billing/ledger visibility; `reviewer` has AI/tender metadata review only.

Missing permissions intentionally remain denied: support private-document access without a valid grant, finance tender/security access, reviewer account/billing mutation, ordinary-admin staff-role assignment, and every normal-user admin operation.

## Migration and sensitive boundaries

`20260718_add_nividaiq_admin_console.sql` adds account/verification/MFA summary fields, revocable session metadata, append-only `admin_audit_events`, append-only `credit_ledger`, `admin_notes`, and expiring `tender_support_access_grants`; it extends feedback assignment/notes. It adds constraints/indexes, enables RLS, revokes browser roles, uses a security-invoker atomic credit function, and installs append-only triggers.

Admin serializers use explicit allowlists. They never select or return password hashes, JWTs, raw/hash session tokens, TOTP secrets, recovery hashes/codes, reset hashes, encryption/service/API/provider keys, payment credentials, storage paths, original PDFs, extracted text, prompts, or tender `analysis_json`. Audit metadata rejects common secret/document keys. IP addresses and forwarded headers are omitted from admin responses.

## Route architecture and access grants

Next.js `/admin` routes render a neutral authorization shell until the authenticated FastAPI overview request succeeds. Every API endpoint applies reusable staff and permission dependencies. Sensitive mutations additionally require authentication within 15 minutes. Pages are `noindex,nofollow` and use separate staff-ID/role/resource/filter/cursor/locale SWR keys; admin cache data is memory-only and cleared on logout, role/account change, or auth invalidation.

Tender lists are metadata-only. `tender_support_access_grants` records user/tender, staff recipient, grantor, purpose, expiry, revocation and break-glass state. An active grant means unexpired and not revoked; every future document read must validate the grant and emit an audit event. Support cannot self-extend grants. This change does not add document delivery or signed URLs.

## Intentionally deferred

Billing-provider integration, paid-user/refund/payment metrics, payment detail, bulk exports, user impersonation, permanent/signed document links, full document viewer, user-facing grant issuance, controlled MFA recovery, notification delivery/outbox metrics, Turnstile operations, and system-setting mutation remain deferred. The UI/API report unavailable data as `null`/“Not available yet”. A per-user export is also deferred until encryption and temporary-download infrastructure are reviewed.

Deployment must apply all preceding migrations, apply the admin migration with the database owner/service role, integrate the existing reviewed MFA ceremony with `app_sessions`, verify backend-only credentials, run the role matrix, then bootstrap the first super-admin with `python -m app.scripts.grant_staff_role --email OWNER_EMAIL --role super_admin` from `backend/`.
