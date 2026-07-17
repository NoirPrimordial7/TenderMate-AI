# Language architecture

## Locale model

```text
Locale = en | hi | mr
tm_locale cookie (primary, 1 year)
localStorage locale (secondary fallback)
authenticated profile preference (highest priority after login)
```

Interface language and analysis language are separate values. The first gate selection initializes both; only the interface language is switched globally in this phase. Original tender clauses, filenames, IDs, email addresses and source values are never translated.

## Rendering boundary

- The root App Router layout awaits `cookies()` and parses `tm_locale` on the server.
- If no valid cookie exists, the provider renders only the language gate. Route children are not mounted, preventing an English hero/login/dashboard flash.
- If a valid cookie exists, `<html lang>` and localized metadata are correct in the first response.
- A localStorage preference may bypass the gate after hydration only when the cookie is absent; it never causes English content to flash.

## Translation system

Use a small structured provider backed by `messages/en.json`, `messages/hi.json` and `messages/mr.json`. It supports namespaced dot keys and interpolation while keeping the language gate and initial hero eager. This avoids locale-prefixed route duplication and is compatible with the existing unprefixed App Router routes.

Namespaces:

- `common`
- `navigation`
- `language`
- `auth`
- `upload`
- `pdfViewer`
- `dashboard`
- `history`
- `pricing`
- `billing`
- `profile`
- `tender`
- `processing`
- `errors`
- `offline`

## Preference synchronization

- `PATCH /api/v1/auth/preferences` accepts only `en`, `hi` or `mr` and only for the bearer-token user.
- `UserResponse` includes `preferred_language` and `preferred_analysis_language`.
- Profile locale wins after authentication and synchronizes the cookie/UI.
- A language switch updates the UI and cookie immediately, then saves the profile asynchronously. API failure is non-blocking and leaves the current local choice active.
- Logout clears only user-scoped in-memory data; `tm_locale` and its non-sensitive fallback remain.

## Gate transition

The gate is a full-screen editorial scene, not a modal. Selection expands its type, sends the other rows out, performs a colour wipe, then reveals the localized app. Reduced motion uses a short opacity transition and moves focus directly to the first meaningful control.
