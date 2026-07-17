# Decision workspace v2 audit

## Baseline

- Branch: `feat/decision-workspace-v2` from `master` at `56b6c8f`.
- Baseline TypeScript lint and Next.js production build pass.
- The approved Electric Editorial entry, language gate, authentication, upload dock, local preview, and app shell are present and out of scope.

## Confirmed implementation gaps

- `TenderWorkspace.tsx` owns every tab, source navigation, report layout, and animation in one client component. Source actions replace the current tab instead of preserving report context.
- The header has an unrestricted title and large decorative geometry; workspace panels use a fixed `31rem` minimum height, producing wasted space.
- Document progress calculates `total - Missing`, incorrectly counting `Not Verified` as ready.
- Schema v1 lacks explanations, verification metadata, normalized money, ISO dates, readiness categories, risk likelihood/mitigation, and confidence.
- Dashboard priority selection excludes only failed records. It can prioritize resumes, invalid documents, and expired tenders.
- Extraction persists OCR metadata but performs no document-type validation. Analysis has no backend guard against non-tender input.
- Recharts is installed but unused. No frontend or backend test suite currently exists.

## Implementation plan

- Add optional schema-v2 fields and a frontend v1-to-report adapter; preserve all existing stored JSON.
- Add deterministic weighted document classification after extraction, persist its result, and enforce it before credit checks or model calls.
- Split the workspace into focused reports, compact header/navigation, lazy charts, and an accessible source drawer.
- Fix document aggregation and dashboard priority/pipeline logic using real validation status.
- Add Vitest utility tests and Python unit tests for schemas, classification, and analysis rejection ordering.
- Extend all three message dictionaries and replace fixed-height workspace CSS with content-led laptop layouts.

## Security and compatibility boundaries

- Tender queries remain user-scoped; signed source URLs remain short-lived and uncached.
- Non-tender rejection occurs before quota checks and credit consumption.
- New database columns are nullable/defaulted and added through an idempotent migration.
- Existing schema-v1 reports remain readable; absent v2 data renders as unavailable rather than inferred.
