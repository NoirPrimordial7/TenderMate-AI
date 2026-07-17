# Final entry layout audit

## Scope and source of truth

This audit covers the current `feat/electric-tender-entry` implementation at commit `ba951d3`. The approved light editorial direction, colour system, giant typography, document art and scene transitions remain the visual source of truth.

## Current structure

- `ElectricEntryWorkspace` owns session/redirect state and renders `Header` plus `HeroStage`.
- `HeroStage` owns auth-sheet visibility and the selected-file visual reaction.
- `HeroHeadline` renders the logged-out and authenticated headline variants.
- `TenderEngineVisual` renders the decorative physical tender stack and pointer depth.
- `ControlDock` owns the accessible auth dialog shell; `AuthDock` owns sign-in/sign-up mode.
- `UploadDock` owns PDF validation, selection, XHR upload progress, cancellation and redirect.

## Alignment and containment issues

1. **Different page containers.** The header and stage both use a `108rem` maximum, while their gutters are separate `clamp()` expressions. The document and CTA then add their own right offsets, so their edges do not share a stable axis.
2. **Viewport-pinned primary actions.** `.te-entry-action` and `.te-upload-dock-slot` are absolutely positioned at the stage bottom. They can collide with the headline/supporting copy or lose safe space on short screens.
3. **Fixed-height scene assumptions.** `.te-stage-inner` is forced to the remaining viewport height and the document slot is `height: 78%`. At 1280x720 the stage is 644px high, the document is 464px high, and the CTA ends at 688px, leaving only 32px to the viewport edge.
4. **Headline scales mostly from width.** The logged-out `13.6vw` and authenticated `9.4vw` rules do not account for short laptop heights. The existing single short-height query is too coarse.
5. **Headline masks can clip.** Each line has `overflow: hidden`; the aggressive `.72` line-height, negative tracking and width-based scale can trim glyph edges and leave insufficient clearance for document overlap.
6. **Uncontrolled overlap layer.** The entire document slot is z-index 7 while the entire hero copy is z-index 4. The document therefore wins over every headline line, instead of using deliberate front/back overlap zones.
7. **Document stage is not bounded by layout.** It is positioned relative to the whole stage with `top`, `right`, percentage height and viewport-based width. Callouts are anchored to the stack, but the stack itself can move toward viewport edges at intermediate widths.
8. **Colour geometry belongs to the viewport, not the document stage.** Violet/blue planes are siblings of the entire stage, so their visual centre can drift away from the document as the layout reflows.
9. **Mobile relies on large negative margins.** The relative document slot uses negative top and bottom margins, which makes spacing sensitive to headline wrapping and screen height.
10. **Upload dock proportions are implicit.** The desktop columns are based on `1fr / 2.25fr / 1fr`, not the intended information hierarchy, and the tablet action column is rearranged independently.
11. **Selected file is only a file row.** It has no real thumbnail, page count or preview action and still says “ready to analyse,” which overstates the current backend flow.
12. **Dropzone click target is partial.** Only the Browse button opens the picker; the main dashed surface is not keyboard/click operable as a whole.
13. **Auth drawer has two alignment systems.** Top controls align to sheet padding, while `.te-auth-dock` uses its own `34rem` maximum and a large independent top margin. This produces excess vertical space and misaligned form edges on shorter screens.
14. **Header mobile padding diverges.** The mobile header switches to `.9rem`, while the stage independently switches to `.9rem`; neither derives from a shared page gutter variable.

## Z-index and overflow risks

- Header: 60; document: 7; CTA: 14; dock: 18; auth overlay: 80; opening wipe: 100.
- The ordering works globally, but the document has no controlled relationship to individual headline layers.
- `.te-stage { overflow: hidden; }` can crop callouts and masks on desktop; tablet switches to `hidden visible`, which is inconsistent and can still hide horizontal overflow silently.
- Profile menu width is viewport-aware but its position depends on the account button rather than a shared right edge.

## Functional contracts to preserve

- Auth continues through `AuthContext.login/signup/logout` and stored bearer sessions.
- Upload remains `POST /tenders/upload` with `FormData` field `file`.
- XHR upload progress must remain based on `event.loaded/event.total`.
- Cancellation remains `AbortSignal` -> `XMLHttpRequest.abort()`.
- Successful upload redirects to `/tender/{tender_id}` without triggering extraction or analysis.
- PDF validation remains `.pdf`/`application/pdf`, non-empty, maximum 20 MB.
- User plan and credits remain sourced from `AuthUser`; no numeric fallback is introduced.

## Recommended reuse

- Preserve `ElectricEntryWorkspace`, auth forms, `AuthContext`, `TenderService`, `BackendTenderRepository`, `apiUploadRequest`, document markup and Header interaction logic.
- Refactor `HeroStage` into normal-flow top grid plus action/dock row.
- Extend `FileSelection` into the selected-PDF editorial preview card.
- Add a focused lazy-loaded `PdfPreviewDrawer`; do not mix PDF rendering into `HeroStage` or the initial hero bundle.
