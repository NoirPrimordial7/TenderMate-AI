# NividaIQ launch foundation audit

## Current state

- Public brand copy is still hard-coded as `TenderMate`/`TenderMate AI` throughout the header, language gate, offline shell, metadata, all three message dictionaries, assistant labels, and backend service descriptions. Internal database and API names can remain unchanged for compatibility.
- Localization already uses one maintainable `en`/`hi`/`mr` dictionary system, a server-readable `tm_locale` cookie, and a shared locale provider. There is no key-parity test and metadata is only a translated title/description.
- Public routes are `/`, `/login`, `/signup`, and `/pricing`. Authenticated routes are `/dashboard`, `/history`, `/billing`, `/profile`, `/upload`, and `/tender/[id]`. No legal, demo, feedback, sitemap, robots, or manifest routes exist.
- There is no public demo. Existing local tender fixtures can inform a new fictional, static-only demo, but must not be fetched through private APIs.
- There is no global footer, reusable AI verification warning, public-beta indicator, product-feedback flow, or performance-mode preference.
- Motion is loaded in the entry, shell, header, drawers, and reports. Recharts report charts are already component-split, but public pages do not expose a low-resource mode. PDF.js is dynamically imported in the local and stored PDF viewers; it must remain outside initial public bundles.
- Authentication, tender ownership, private PDF access, assistant history, and analysis APIs are backend-scoped. Public launch work must not rename existing TenderMate database/API identifiers.
- Existing rate limiting is an in-memory backend service with per-route rules. It is suitable for development but is not distributed across production instances.
- Existing AI field feedback is tender/model-run scoped, not a global product-feedback channel. There is no anonymous feedback support.
- User records already store interface and analysis language. They do not store training consent or legal acceptance state.

## Implementation plan

1. Centralize public brand and legal-version configuration, then replace user-visible legacy branding without renaming internal contracts.
2. Add locale-aware metadata, manifest, sitemap, robots, public/private noindex rules, a multilingual footer, public-beta label, and calm verification warning.
3. Add static multilingual legal documents through an indexable dynamic legal route and a fictional, no-API public demo.
4. Add explicit legal acceptance and optional training-consent state through authenticated backend APIs and idempotent migrations.
5. Add privacy-limited product feedback with separate anonymous/authenticated rate limits and a global accessible dialog.
6. Add automatic/full/low-resource modes that preserve core workflows and reduce non-essential motion/effects.
7. Add key-parity, brand, legal/demo, performance, feedback, acceptance, and route-construction tests.

## Launch-readiness details still required

- Legal entity/operator name
- Business address
- Public support, privacy, and grievance email addresses
- Grievance officer name
- Confirmed governing jurisdiction and court location (only `Maharashtra` is currently proposed)
- Legal effective/last-reviewed dates and professional legal review
- Production `NEXT_PUBLIC_APP_URL`
- Final social profile URLs
- Distributed production rate-limit storage and operational feedback triage process

## Intentionally deferred

- Razorpay and payment activation
- Paid-credit entitlement changes
- Production PDF export
- Market-price research
- Model switching or training automation
- DNS/registrar redirects
- Public staff/admin feedback dashboard

All policy drafts in this PR require professional legal review before payments or a final public launch.
