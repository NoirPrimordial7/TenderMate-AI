# Safe app-shell cache strategy

## Tier 1 — static shell

Next already emits hashed JavaScript and CSS assets. A small production-only service worker adds runtime stale-while-revalidate caching only for `/_next/static`, explicit `/icons/` and `/images/` assets, the favicon and the standalone `/offline.html` fallback. It does not use a broad image-destination rule, so an application-served upload can never enter the shell cache accidentally.

The service worker never caches:

- `/api/` or the configured FastAPI origin
- route documents or RSC payloads
- bearer tokens or auth responses
- raw PDFs, blob URLs or signed URLs
- extracted text, analysis output or company documents

`/sw.js` itself is served with `no-cache, no-store, must-revalidate` headers so fixes are discovered promptly. Service worker registration is disabled in development to prevent localhost/preview drift.

## Tier 2 — idle route prefetch

After hydration, a client helper uses `requestIdleCallback` (timeout fallback) and `router.prefetch()`:

- authenticated: `/dashboard`, `/history`, `/profile`, `/pricing`
- unauthenticated: `/login`, `/signup`, `/pricing`

Prefetch is skipped for `Save-Data`, `slow-2g`, or devices reporting <=2 GB memory. Next keeps route payloads in its in-memory client cache and deduplicates shared layouts.

## Tier 3 — user-scoped stale-while-revalidate

SWR provides in-memory-only caching and quiet revalidation for:

- `/auth/me` profile and credit data
- latest dashboard tender metadata
- tender history summary
- billing usage and plan metadata

Private keys include the user identity/token boundary. Logout clears all `private` SWR keys without touching public/static caches. No SWR provider is persisted to localStorage or IndexedDB.

## Local file boundary

Selected `File`, object URLs, thumbnails and PDF.js documents stay in component memory. Refresh or logout revokes/destroys them and requires reselection. A successful backend upload is subsequently addressed only through its tender record ID.
