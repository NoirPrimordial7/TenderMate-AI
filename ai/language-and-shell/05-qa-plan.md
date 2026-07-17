# QA plan

## Build and state

- Confirm branch and commit; preserve untracked `postman/`.
- Run lint, full TypeScript and production build.
- Stop the exact dev listener, verify `E:\TenderMate-AI\.next`, remove only that directory, reinstall nothing unless lock integrity requires it, and start a clean dev server.

## Language

- Clear `tm_locale` and fallback storage: gate is the only visible app UI.
- Select English, Hindi and Marathi separately; verify native scripts, `html[lang]`, title, persistence and route retention.
- Returning visit bypasses the gate with no English hero flash.
- Logged-in profile preference overrides cookie; language switching does not log out or clear a selected in-memory PDF.
- Profile-save failure remains non-blocking.
- Reduced-motion selection uses a crossfade.

## Layout matrix

320x568, 360x800, 390x844, 430x932, 768x1024, 1024x768, 1280x720, 1366x768, 1440x900, 1512x982, 1728x1117 and 1920x1080.

At each size verify no horizontal overflow, shared axes, visible primary action, intentional document overlap, safe dock bottom gap and 44px controls. Repeat critical pages at 200% zoom.

## Functional

- Sign in, signup and logout contracts remain unchanged.
- Valid PDF: thumbnail, size, pages, preview, Replace, Remove and upload action.
- Invalid, corrupt, password-protected and >20 MB files remain blocked.
- Refresh clears the local file; no PDF bytes appear in storage/cache.
- Successful upload still redirects to `/tender/{tender_id}`.

## Cache and offline

- Idle prefetch fires only on acceptable network/device conditions.
- SWR shows cached in-memory data then revalidates.
- Logout clears private SWR keys.
- Production service worker caches static hashed assets and `/offline.html` only.
- Offline navigation displays the selected-language reconnect message and no private content.
- Inspect Cache Storage and service worker requests for PDFs, API responses, tokens and private route HTML: none permitted.

## Executed checks

- TypeScript/lint: pass.
- Production build: pass on Next.js 16.2.9.
- Backend module compilation and Pydantic locale validation: pass.
- Translation dictionary parity: 238 keys in each of English, Hindi and Marathi; no missing or extra keys.
- First visit: only the language scene rendered at 1366x768.
- Selection: production build transitioned to the localized hero; returning Marathi load bypassed the gate and rendered Marathi in the first route tree.
- Language switching: English â†’ Hindi â†’ Marathi updated `html[lang]`, navigation, hero copy, document intelligence labels and accessibility names without navigation or logout.
- Layout: 1366x768, 1440x900 and 1512x982 desktop measurements had no horizontal overflow; 390x844 Marathi had no horizontal overflow and used normal vertical page flow.
- Mobile navigation: focusable, localized, closes after language selection, and important controls remain at least 44px.
- Authenticated live API/upload checks remain dependent on applying the included database migration and a valid local backend session; no production account or PDF was created as part of visual QA.
