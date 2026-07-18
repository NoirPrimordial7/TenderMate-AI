# NividaIQ Admin Console Integration Audit

## Data and authentication authority

Audit reconciled with account-security commit `0a9040e`. Authentication authority remains `public.app_users.password_hash` through FastAPI JWTs and the backend Supabase service-role client; Supabase Auth is not used. Authoritative sessions and assurance are in `user_sessions`; TOTP factors and recovery codes are in `user_mfa_factors` and `user_mfa_recovery_codes`; security activity and notifications are in `account_security_events` and `security_notification_outbox`.

User, plan and analysis-credit state are in `app_users`; tender metadata/content are split across `tenders`, `uploads`, and `tender_pages`; assistant activity is in `tender_chat_messages`; AI telemetry is in `ai_model_runs`; product feedback is in `product_feedback`; legal acceptance is in `user_legal_acceptances`; training consent is `app_users.training_consent`; payments remain placeholders. Customer tender repositories retain `user_id` ownership predicates. All admin browser traffic uses `/api/v1/admin`; the frontend has no Supabase client or service-role credential.

## Account-security integration

Admin authorization reuses `get_current_session`, `AccountSecurityService.validate_session`, `SecurityRepository`, and `AccountSecurityService.require_recent_login`. JWT `sid` selects the server session; the database supplies revocation, expiry, `mfa_verified` (AAL2), and `recent_auth_at`. Admin access additionally requires a verified TOTP factor, `app_users.mfa_enabled`, verified email, active account, staff role and endpoint permission. No header, browser field, or JWT role claim is accepted as final role or assurance authority. The removed `app_sessions` placeholder and token-hash lookup are not part of the integrated design.

## Roles and permissions

`app_users.role` remains the only role authority. Supported staff roles are `super_admin`, `admin`, `support`, `finance`, and `reviewer`. `super_admin` controls staff roles and break-glass authority; `admin` handles normal accounts, plans, credits and sessions; `support` has lookup, feedback, notes and safe revocation; `finance` has billing/ledger visibility; `reviewer` has AI/tender metadata review only. Support private-document access without a valid grant, finance tender/security access, reviewer credit mutation, ordinary-admin staff-role assignment, self-promotion, self-suspension and removal of the last active super-admin are denied server-side.

## Migration history and sensitive boundaries

`20260718_add_account_security_mfa.sql` owns sessions, MFA, recovery codes, recent authentication, verified email, security events, notifications and the Turnstile-backed security flow. `20260718_add_nividaiq_admin_console.sql` adds only admin/account-operation state, append-only `admin_audit_events`, append-only `credit_ledger`, `admin_notes`, expiring `tender_support_access_grants`, feedback assignment/notes, admin indexes, constraints, RLS and safe aggregate functions. It does not create or alter a parallel session table.

Admin serializers use explicit allowlists. They never select or return password hashes, JWTs, raw/hash session tokens, TOTP ciphertext, recovery hashes/codes, reset hashes, encryption/service/API/provider keys, payment credentials, storage paths, original PDFs, extracted text, prompts, or tender `analysis_json`. Audit metadata rejects common secret/document keys. Only masked `ip_hint` values from account security may appear; full forwarded headers and tokens do not.

## Routes, access grants and cache

Next.js `/admin` routes render a neutral authorization shell until the authenticated FastAPI overview request succeeds. Every endpoint applies reusable staff and permission dependencies; sensitive mutations use the configured account-security recent-authentication window. Pages are `noindex,nofollow` and use staff-ID/role/permission/resource/filter/cursor/locale SWR keys. Admin data is memory-only and cleared on logout, role/permission or account change, session invalidation, or lost MFA assurance. Support-document decisions, signed URLs and sensitive details are never persisted.

`tender_support_access_grants` records user/tender, staff recipient, grantor, purpose, expiry, revocation and break-glass state. An active grant is unexpired and not revoked; every future document read must validate it and emit an audit event. Support cannot self-extend grants. This change does not add document delivery or signed URLs.

## Intentionally deferred

Billing-provider integration, paid-user/refund/payment metrics, payment detail, bulk exports, user impersonation, permanent/signed document links, full document viewer, user-facing grant issuance, controlled staff-assisted MFA recovery, notification delivery, and system-setting mutation remain deferred. Unavailable data is returned as `null` and displayed as “Not available yet”. Per-user export remains deferred pending reviewed encryption and temporary-download infrastructure.

Apply the account-security migration before the admin migration, verify backend-only credentials, run the role matrix, then bootstrap an already verified, MFA-enrolled owner with `python -m app.scripts.grant_staff_role --email OWNER_EMAIL --role super_admin` from `backend/`.
