# Local PDF preview plan

## Rendering choice

Use `pdfjs-dist` directly through a small custom viewer. This avoids a second React abstraction, renders only the current page, and supports both the dock thumbnail and the full preview drawer.

The heavy renderer will be loaded only after a valid PDF is selected. The full drawer component will be loaded with `next/dynamic` and `ssr: false`; PDF.js itself will be imported inside the browser-only renderer module.

## File lifecycle

1. Validate the local `File` before preview code loads.
2. Create one object URL for the selected file.
3. Load the PDF from that URL without uploading it.
4. Revoke the object URL and destroy the PDF.js loading/document tasks when the file changes or the dock unmounts.
5. Keep page count and first-page thumbnail metadata local to the upload dock.

## Selected state

The selected-PDF card will show:

- actual first-page canvas thumbnail
- filename and formatted size
- page count when loaded
- explicit “PDF validated” state
- Preview PDF, Replace and Remove actions

Loading, corrupt and password-protected states remain visible without invalidating the already-passed file type/size check.

## Drawer behavior

- Desktop width: `clamp(32.5rem, 48vw, 56.25rem)`
- Tablet width: approximately 72vw
- Mobile: full screen
- Right-side violet/blue sweep followed by drawer and current page reveal
- Page navigation, zoom in/out, fit-width and close controls
- Render only the current page canvas
- Clamp zoom to a usable range and recompute fit width from the viewer container

## Accessibility

- `role="dialog"`, `aria-modal="true"`, labelled title
- focus trap and initial focus
- Escape and backdrop close
- body scroll lock
- focus restoration to Preview PDF
- disabled previous/next controls at document bounds
- live loading/error/page announcements
- minimum 44px controls
- reduced-motion durations set to zero while preserving state changes

## Error handling

- Generic corrupt/malformed PDF: “This PDF could not be opened. It may be damaged or incomplete.”
- Password-protected PDF: “This PDF is password-protected. Remove the password before uploading.”
- Page render failure: keep the drawer open and expose a retry-friendly message.
- PDF metadata failure does not upload or mutate remote state.

## Worker strategy

Configure `GlobalWorkerOptions.workerSrc` from the bundled `pdf.worker.min.mjs` asset using a module URL compatible with the current Next.js build. Confirm worker loading in the production build and browser, not only in development.
