# NividaIQ cache and revalidation audit

## Current data flow

- SWR 2.4 is configured once in `src/app/providers.tsx` with an in-memory `Map`, 20-second request deduplication, reconnect revalidation, no retries, and no typed key or policy layer.
- Auth, dashboard, history, billing usage, pricing, tender detail, signed PDF source, and tender chat use independent `useSWR` calls. Key shapes are manually repeated and do not consistently include locale, report version, query state, or pagination.
- Dashboard and history both request the complete `/tenders` collection, duplicating the same private request and rendering blocking skeletons whenever no current component-local value exists.
- Tender detail is keyed only by user and tender ID. Completed analysis versions are not represented in the key, and processing state has no visibility-aware polling fallback.
- Chat history reloads the full conversation. Question submission is optimistic, but local IDs are timestamp-only and merging can duplicate messages after revalidation. There is no `after` cursor.
- Billing usage is fetched independently by dashboard, billing, and profile. Identical keys deduplicate only while mounted under the same provider; analysis completion does not explicitly invalidate credits.
- Signed PDF URLs use ordinary private SWR memory with a four-minute deduplication interval. They are not persisted, but expiry metadata and automatic expiry recovery are absent.
- `apiRequest` forces `no-store` and supports caller cancellation, but read services do not consistently accept `AbortSignal`. There is no ETag/If-None-Match support.
- No Supabase browser client or Realtime subscription exists. Adding direct client Realtime now would require public configuration and a security review of channel/RLS behavior.
- Logout clears SWR keys beginning with `private`, plus stored auth. There is no versioned, user-scoped UI snapshot store to clear.
- Route prefetch is already idle-, Save-Data-, and device-memory-aware. PDF.js and Recharts are already dynamically loaded at interaction/report boundaries.

## Implementation plan

1. Centralize typed cache keys, SWR policies, visibility/network-aware polling, scoped invalidation, and safe retry behavior.
2. Add a small versioned persistent snapshot containing only tender list summaries, names, status, timestamps, and limited report-summary fields, namespaced by user and cleared on logout/user switch/expiry.
3. Share dashboard/history data, retain stale content during refresh, add translated refresh/stale indicators, and introduce cursor-ready history response handling without breaking the existing array contract.
4. Make tender polling visibility-aware while processing, make completed report identity version-aware, and invalidate billing/history/tender resources after processing.
5. Add incremental, deduplicated chat merging and safe optimistic rollback. Keep signed URLs memory-only and expiration-aware.
6. Add backend private cache headers, ETag/If-None-Match support, `updated_since` and cursor/limit tender listing, chat `after` filtering, report version/updated metadata, and tests.

## Security boundaries

Persistent storage may contain only minimal tender-list UI snapshots and their expiry/schema/user namespace. It must never contain tokens, cookies, PDF bytes, signed URLs, extracted text, complete reports, chat history, prompts, payment/security information, or ownership decisions. Backend ownership checks remain authoritative for every request.

## Deferred

- Supabase Realtime subscriptions are deferred until a browser-safe Supabase configuration and authenticated RLS channel policy are available. The implemented event-invalidation interface is Realtime-ready and uses visibility-aware polling as the production-safe fallback.
- List virtualization is not warranted for the current paginated page size; incremental rendering/pagination prevents loading an unbounded DOM list.
