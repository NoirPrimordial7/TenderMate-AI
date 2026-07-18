# NividaIQ account security audit

## Baseline

- `master` is at `5fc0dc7` with launch foundation and cache-first revalidation merged.
- Authentication is a custom FastAPI password flow backed by `public.app_users`; passwords use Argon2 through `pwdlib` and access tokens are HS256 JWTs.
- Login already has IP throttling, failed-login counters, temporary account locks, and best-effort audit logging.
- The browser currently stores the bearer token and cached user in local storage. Logout clears stored auth, user-scoped SWR data, conditional response data, and minimal private snapshots.
- NividaIQ branding, legal acceptance, feedback, training consent, performance modes, and English/Hindi/Marathi dictionaries are already shared application infrastructure.

## Security gaps

- JWTs are stateless and cannot revoke a single device or all active sessions.
- There is no authenticator-app TOTP enrollment or login challenge, no recovery-code lifecycle, and no staff/admin MFA enforcement.
- Sensitive account mutations do not have a recent-login proof.
- There is no password reset/change endpoint, reset-token rotation, session revocation after password changes, or recovery notification record.
- Cloudflare Turnstile is not supported on login, signup, or recovery endpoints.
- Audit events are not exposed as a user-scoped security activity feed.
- There is no frontend security workspace or MFA challenge state.

## Implementation

- Add idempotent tables for MFA factors, one-time recovery codes, revocable sessions, password reset tokens, security events, and notification outbox records, all protected by ownership-aware RLS.
- Add encrypted TOTP secrets, standards-based RFC 6238 validation, single-use recovery codes, short-lived purpose-bound MFA challenge JWTs, session IDs in access tokens, and recent-auth timestamps.
- Enforce MFA for enabled accounts and for staff/admin roles, while keeping it optional for ordinary users.
- Add password change/reset hardening, Turnstile verification hooks, endpoint-specific rate limits, safe session/device summaries, and security notification events.
- Add a multilingual profile security center and an accessible MFA step during login without replacing the launch or cache providers.

## Boundaries

- No Razorpay, billing activation, or unrelated tender changes.
- Secrets, TOTP seeds, recovery-code hashes, reset-token hashes, and full tokens remain backend-only.
- Turnstile remains disabled unless both public and secret configuration are supplied; production deployment must configure them together.
- Notification delivery is recorded in an outbox/audit trail in this phase; an external transactional-email provider is intentionally not introduced.
