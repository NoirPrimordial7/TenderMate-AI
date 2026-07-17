# Component plan

## Routes

- `/`: `ElectricEntryWorkspace`; authenticated users remain on the page and see upload.
- `/login`: same workspace, sign-in mode, default successful redirect to `/dashboard`, safe `next` override.
- `/signup`: same workspace, create-account mode, default successful redirect to `/dashboard`, safe `next` override.
- `/upload`: same workspace and upload/auth behavior, no duplicated upload card shell.

## Components

`src/components/entry/ElectricEntryWorkspace.tsx`

- Reads auth state, resolves safe redirect, coordinates auth/upload dock presence, and renders the single stage.

`HeroStage.tsx`

- Owns the 12-column composition and lightweight pointer depth values.

`HeroHeadline.tsx`

- Product label, masked headline lines, supporting copy, and two technical proof labels (not feature cards).

`TenderEngineVisual.tsx`

- Decorative DOM/SVG document-engine object, OCR frames, scanner, status rail, and reduced-motion-safe final state.

`ControlDock.tsx`

- Shared powered shell for loading, auth, and upload states; controls presence/layout transitions.

`AuthDock.tsx`

- Accessible two-mode switch and privacy/support copy.

`SignInForm.tsx` / `SignUpForm.tsx`

- Preserve current validation and AuthContext calls; expose `onAuthenticated`; share field primitives.

`AuthFields.tsx`

- Typed text/password fields, labels, descriptions, password visibility, focus states, required attributes.

`UploadDock.tsx`

- User greeting, actual usage values, file state, progress, cancellation, error/success, and redirect.

`UploadDropzone.tsx`

- Drag/drop and keyboard file picker fallback with clear screen-reader instructions.

`FileSelection.tsx`

- Name, size, valid state, replace and remove controls.

`DockStatus.tsx`

- Accessible neutral/success/warning/danger messaging with live-region support.

`Header.tsx`

- Active desktop nav, real account usage, accessible profile menu, accessible mobile dialog/menu, route/outside-click/Escape dismissal, focus management, and background-scroll lock.

## Service changes

- Add upload-specific XHR transport beside `apiRequest`; retain bearer token, response/error conversion, auth invalidation, `FormData`, abort signal, and response type.
- Thread optional `UploadRequestOptions` through repository and service without changing existing call compatibility.

## Dependency decision

- Add `motion` only. It provides presence/layout/state choreography that would otherwise require duplicated effect/timer code.
- Do not add a UI kit, GSAP, smooth scroll, WebGL, or form library.

