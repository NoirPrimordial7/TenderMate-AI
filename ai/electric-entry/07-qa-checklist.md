# Electric entry QA checklist

## Automated

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] No new TypeScript errors or build warnings
- [ ] No runtime error overlay or console errors

## Authentication

- [ ] Logged-out home shows sign-in mode
- [ ] Sign-in validation and password visibility work
- [ ] Sign-in calls the existing API and applies the returned session
- [ ] Homepage transforms to upload after successful auth
- [ ] `/login` preserves default dashboard redirect
- [ ] Safe internal `next` redirect works; external/protocol-relative values are rejected
- [ ] Signup validates all fields and calls the existing API
- [ ] `/signup` preserves default dashboard redirect
- [ ] API errors are announced
- [ ] Logout clears storage, closes menus, and redirects

## Upload

- [ ] PDF can be selected by picker and dropped
- [ ] Non-PDF rejection is visible and announced
- [ ] Empty PDF is rejected
- [ ] Files over 20 MB are rejected client-side
- [ ] Selected file name and actual size display
- [ ] Replace and remove actions work
- [ ] Upload sends bearer-authenticated `FormData` field `file`
- [ ] Numerical progress appears only from computable browser upload bytes
- [ ] Cancellation aborts XHR and preserves the selected file
- [ ] Duplicate submission is prevented
- [ ] HTTP 401, 413, 429, network, and 5xx states remain understandable
- [ ] Success uses the backend message and redirects to `/tender/{tender_id}`
- [ ] No OCR/extraction/analysis progress is shown

## Header and keyboard

- [ ] Active route is visible and exposed with `aria-current`
- [ ] Profile menu opens by keyboard and has visible focus
- [ ] Profile menu closes on outside click, Escape, and route selection
- [ ] Mobile menu opens/closes, traps focus, closes on outside click/Escape/route selection
- [ ] Body scroll locking is restored after menu close
- [ ] All important targets are at least 44 px

## Motion and accessibility

- [ ] Initial reveal is readable before completion and never blocks controls
- [ ] Auth mode switch preserves focus and labels
- [ ] Logged-out to logged-in activation is clear
- [ ] Drag/file/progress/success transitions communicate state
- [ ] Reduced motion removes scanner, parallax, shimmer, blur, and staged reveal
- [ ] Heading order is logical
- [ ] Focus is visible on lime, dark, and paper surfaces
- [ ] Errors and progress use live regions
- [ ] No information is conveyed only by colour
- [ ] Contrast is sufficient for body, labels, inputs, and disabled states

## Responsive visual QA

- [ ] 320×568
- [ ] 360×800
- [ ] 390×844
- [ ] 430×932
- [ ] 768×1024
- [ ] 1024×768
- [ ] 1280×720
- [ ] 1440×900
- [ ] 1920×1080
- [ ] No horizontal scrolling or clipped menus
- [ ] Works at 200% zoom

## Content and scope

- [ ] No fake credits or plan values in edited components
- [ ] No fake OCR percentage or asynchronous processing state
- [ ] No medical/beige aesthetic or generic white-card split hero
- [ ] No new marketing sections
- [ ] Dashboard content was not redesigned

## Execution record — 17 July 2026

- [x] `npm run lint` passed after the final edits.
- [x] `npm run build` completed all 15 static/SSG routes without warnings.
- [x] Logged-out sign-in, sign-up mode switching, password visibility, client validation, and assertive error copy were exercised in-browser.
- [x] Cached authenticated UI, real plan/credit rendering, profile menu, and mobile navigation were exercised without writing account data.
- [x] Valid PDF selection, selected-file presentation, non-PDF rejection, and 21 MB rejection were exercised with temporary local fixtures.
- [x] Escape dismissal, focus return, mobile body scroll restoration, and profile/mobile menu states were inspected.
- [x] Reduced-motion emulation returned `animation-name: none` for the scanner, OCR boxes, and cycling status labels.
- [x] All nine target viewports returned `scrollWidth === clientWidth`; no clipped dock or mobile menu was observed.
- [x] No fake plan, credit, OCR percentage, or processing state remains in the edited entry components.
- [x] Dashboard content and backend contracts were not redesigned.
- [ ] Credentialed sign-in, sign-up, logout, and successful remote upload were not executed because no dedicated QA account or isolated backend was provided. Their existing context/service contracts were preserved and the client states were verified without mutating external data.
