# NividaIQ account-security architecture review

## Authentication authority

NividaIQ uses **custom FastAPI JWT authentication**, not Supabase Auth and not a hybrid assurance system.

- `backend/app/services/auth_service.py:33-218` owns signup, Argon2 password verification, login, lockout, JWT/session validation, and user lookup. Password hashes are written to `public.app_users` at line 81.
- `backend/app/core/security.py:31-107` mints and verifies NividaIQ JWTs.
- `backend/app/api/dependencies/auth.py` authenticates requests with FastAPI `HTTPBearer` and the custom `AuthService`.
- `backend/app/db/supabase_client.py:6-22` creates a database client with `SUPABASE_SERVICE_ROLE_KEY`; no application code calls `supabase.auth`, GoTrue enrollment, or Supabase factor APIs.

Supabase is the private persistence/storage provider. It is not an authentication authority. Supabase MFA/AAL2 should **not** be layered onto this branch because that would introduce a second session and assurance authority. Replacing custom MFA with Supabase MFA is appropriate only as part of an explicit full migration of passwords, sessions, recovery, and backend JWT verification to Supabase Auth.

The custom password-reset flow is therefore also the coherent architecture: reset tokens update the authoritative `app_users.password_hash`. Supabase Auth recovery would not update that password and must not be added alongside it.

## Classified findings

| Severity | Finding | Resolution |
| --- | --- | --- |
| BLOCKER | Recovery codes were verified and then updated without an ownership-scoped atomic `used_at is null` condition, allowing concurrent replay. | Fixed. Consumption now includes code ID, user ID, and unused state and succeeds only when the update returns a row. |
| HIGH | Recovery-code regeneration and MFA removal used multiple database requests, so a mid-operation failure could leave a user without codes or with `mfa_enabled` but no factor. | Fixed. Service-role-only, security-invoker database functions perform each replacement/removal transaction atomically. Verified factors also cannot be overwritten by starting enrollment again. |
| BLOCKER | Password-reset tokens were read and consumed in separate operations, allowing concurrent password resets with one token. | Fixed. `consume_valid_reset_token` atomically claims an unexpired, unused hash before changing the password. |
| HIGH | Password updates, reset-token invalidation, and session revocation were separate requests; a partial failure could leave an old reset link or session valid after a password change. | Fixed. Password mutation, reset invalidation, and the appropriate session revocation now run in one restricted database transaction. |
| HIGH | A valid TOTP could be replayed in the same timestep, and an MFA challenge JWT could be reused during its five-minute lifetime. | Fixed. The factor atomically claims a monotonically increasing timestep, and a hashed challenge `jti` is persisted and consumed once. |
| HIGH | MFA failures had only IP throttling, without account/factor backoff. Distributed attempts could avoid the IP limit. | Fixed. Factor-bound failures are incremented atomically by a service-role-only, security-invoker SQL function and lock the factor temporarily after the configured threshold. IP rate limiting remains in addition. |
| HIGH | Enabling MFA left other password-only sessions active and left the current database session marked as not MFA verified. | Fixed. Confirmation marks the current server session MFA verified and revokes all other sessions. Protected authentication rejects an MFA-required user whose server session lacks MFA verification. JWTs no longer carry a competing MFA-assurance claim; the user-scoped server session is authoritative. |
| HIGH | No encryption-key rotation path existed; replacing `MFA_ENCRYPTION_KEY` would lock every enrolled account. | Fixed. `MFA_PREVIOUS_ENCRYPTION_KEYS` forms a decrypt-only fallback ring. A factor decrypted with an old key is immediately re-encrypted using the active key. |
| HIGH | Turnstile validation accepted a success response without checking hostname or widget action. | Fixed. Backend validation now requires the expected `login`, `signup`, or `password-reset` action and validates configured hostnames. Provider errors and missing production configuration fail closed; endpoint rate limits remain independent. |
| HIGH | Rate-limit and audit IP identity trusted `X-Forwarded-For` from any caller, allowing direct clients to rotate the apparent address. | Fixed. Forwarded headers are accepted only when the TCP peer belongs to an explicitly configured `TRUSTED_PROXY_CIDRS` network; malformed values and untrusted peers fall back to the socket address. |
| HIGH | Direct database grants could permit reads of session/activity tables if a future Supabase Auth identity matched an application user UUID. | Fixed. All new security tables are revoked from `anon` and `authenticated`; user access is only through ownership-validating FastAPI endpoints. RLS remains enabled as defense in depth. |
| MEDIUM | The browser stores the short-lived bearer token in local storage, so a future same-origin XSS could exfiltrate it. | Remaining risk. Existing React rendering, CSP/dependency review, 60-minute expiry, and server revocation reduce exposure. Moving to HttpOnly same-site cookies requires a separate CSRF-aware auth migration. |
| MEDIUM | Security notifications and reset delivery are durable outbox records but no transactional-email dispatcher exists in this repository. | Remaining launch dependency. Recovery-code use, factor changes, locks, password changes, and resets now enqueue events without storing plaintext recovery codes. Do not enable public password recovery until an authenticated outbox worker is deployed. |
| LOW | Used/expired MFA challenge and reset rows are not periodically purged. | Remaining operational task. They contain hashes/metadata, not plaintext credentials, and remain protected by RLS/revoked grants. Add retention cleanup before long-term production operation. |
| ACCEPTED | TOTP secret generation uses `secrets.token_bytes(20)` (160 bits), Base32 provisioning, SHA-1/HOTP truncation, strict six digits, constant-time comparison, and a limited ±1 timestep skew. | Meets RFC 6238 interoperability and brute-force requirements when combined with replay claiming, lockout, and rate limits. |
| ACCEPTED | Fernet provides authenticated encryption for stored TOTP seeds. No default production key is invented; missing/invalid keys fail closed. | Plaintext exists only during provisioning/verification and is not logged or written to audit records. |
| ACCEPTED | Recovery codes use a 32-character alphabet and 12 random characters (60 bits), are shown only at creation/regeneration, stored as Argon2 hashes, invalidated on regeneration, user-scoped, and atomically single-use. | A server pepper is not required for these high-entropy random values; the database never stores plaintext. Successful recovery use records an event and queues a notification. |
| ACCEPTED | Session IDs come from PostgreSQL `gen_random_uuid()`, are bound to the JWT subject and database user, and are checked server-side on every authenticated request. | Revoked/expired sessions fail authentication; there is no refresh-token path. Current/other/all revocation is user-scoped. Legacy JWTs without `sid` are rejected. |
| ACCEPTED | HS256 signing configuration now rejects configured JWT secrets shorter than 32 bytes. | The local configured secret meets this floor; production must generate and retain an independent high-entropy secret. |
| ACCEPTED | Password-reset responses are generic for known/unknown accounts; tokens are 48-byte URL-safe random values, stored only as SHA-256 hashes, expire in 30 minutes, are one-time, and revoke sessions on success. | New requests invalidate previous links. Password changes invalidate pending links. The reset page removes the token from the address bar and uses `no-referrer`; no redirect parameter exists. |
| ACCEPTED | The migration is transactional and idempotent, has cascading ownership foreign keys, active-row indexes, constraints, RLS, and no client grants to secret tables. | The sole helper function is `SECURITY INVOKER`, is revoked from public/anonymous/authenticated roles, and is executable only by `service_role`; it cannot elevate caller privileges. No direct staff read path is granted. |

## Key-rotation procedure

1. Generate a new Fernet key outside the repository.
2. Set it as `MFA_ENCRYPTION_KEY`.
3. Put the immediately previous active key in `MFA_PREVIOUS_ENCRYPTION_KEYS`; retain older keys there until every active factor has been exercised or a controlled migration re-encrypts all rows.
4. Deploy backend instances with the same ordered key ring.
5. Monitor factor-decryption failures without logging ciphertext or secrets.
6. Remove an old key only after its factor population is zero or the retention window has been formally closed.

The active key encrypts all new factors. Previous keys are decrypt-only, and successful use performs lazy rotation. If no configured key can decrypt a factor, verification fails closed.

## Migration review

`database/migrations/20260718_add_account_security_mfa.sql` was reviewed but not applied. It adds factor, recovery, one-time challenge, revocable session, reset-token, security-event, and notification-outbox storage. Every table is tied to `app_users` with cascading deletion. Secret-bearing tables have no browser-client privileges. The backend still verifies ownership from the custom JWT and never trusts a browser-supplied user ID.

No staff-wide database access is implemented. That is safer than an unverified staff policy; a future support console must establish a backend-verified staff role and separate audit path rather than widening these RLS policies.

## Remaining deployment risks

- Apply the migration before deploying code that issues server-backed sessions.
- Configure a strong `MFA_ENCRYPTION_KEY`, retained previous-key ring, Turnstile secret/site keys, and exact production hostname allowlist together.
- Deploy and monitor the private notification outbox worker before advertising password recovery or security email delivery.
- Plan an HttpOnly-cookie migration if the application threat model expands to third-party scripts or user-authored HTML.
- Add scheduled retention for used/expired challenges, reset records, old sessions, and notification rows.
