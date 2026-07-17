# Responsive QA plan

## Target matrix

- 320x568
- 360x800
- 390x844
- 430x932
- 768x1024
- 1024x768
- 1280x720
- 1366x768
- 1440x900
- 1600x900
- 1920x1080

## Checks at every size

- `scrollWidth === innerWidth`
- header brand and hero label share the same left axis
- document/dock share the same right axis
- every headline word is readable and not clipped
- document overlap is deliberate and does not hide essential words
- callouts remain within the document stage and viewport
- CTA/dock remains in normal flow with safe space below
- no action target is smaller than 44px
- auth and preview sheets fit without clipped controls
- profile/mobile menus remain inside the viewport
- no body scroll while modal/mobile menu is open

## Breakpoint intent

- **Above 1024px:** 12-column hero; deliberate copy/document overlap; full horizontal dock.
- **768-1024px:** retain overlap with smaller document; dock becomes two rows; preview about 72vw.
- **Below 768px:** headline remains dominant; document follows/partially overlaps through negative grid margin only within its bounded stage; controls stack; full-screen preview.
- **Short screens <=820px:** reduce top padding, headline scale, document scale and section gap.
- **Very short screens <=720px:** preserve actions through content flow and scrolling; never hide copy, CTA, dock or drawer controls.

## Interaction QA

- open/close auth via mouse, keyboard and Escape
- switch sign-in/create-account and submit validation
- open/close mobile menu and account menu
- browse, drag/drop, replace and remove PDF
- selected file thumbnail and page count
- preview open/close, focus trap/restoration, page navigation and zoom
- corrupt/password PDF messages
- actual XHR progress, cancel and duplicate-submit prevention
- reduced-motion scanner/parallax suppression

## Visual evidence

Capture final screenshots for logged-out desktop, authenticated empty dock, authenticated selected file, preview drawer, auth drawer, tablet and mobile. Use local cached session data only for visual state QA; do not create production accounts or upload user data without explicit credentials.

## Final verification results

- All target viewport widths were exercised locally; `scrollWidth === innerWidth` at every listed size from 320x568 through 1920x1080.
- Logged-out desktop, tablet and mobile scenes retain the editorial headline/document overlap without clipping the CTA.
- Authenticated empty and selected-file docks stay in normal flow; the 1280x720 short-screen layout keeps the action rail reachable.
- The mobile auth sheet and PDF preview use full-screen layouts with 44px-or-larger primary controls.
- Reduced-motion mode removes the opening wipe, scanner, parallax and ambient loops while preserving final content and necessary state transitions.
- A local two-page PDF rendered in both the first-page thumbnail and drawer; page navigation, zoom, fit width, Escape close, focus restoration and body scroll lock passed.
- Non-PDF, over-20MB, corrupt and password-protected fixtures were rejected with distinct messages; Replace, Remove and drag/drop selection passed.
- The upload UI was exercised with a local stub transport emitting real byte totals, including duplicate-submission protection and the existing `/tender/{tender_id}` redirect. No production account or user document was created during QA.
- `npm run lint`, full TypeScript checking and `npm run build` pass on the final implementation.
