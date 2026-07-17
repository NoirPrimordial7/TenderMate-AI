# Electric visual system

## Core composition

The first viewport is one continuous dark stage. On desktop, a 12-column grid places the headline across the left seven columns, the engine across the central six columns with intentional overlap, and the control dock across the right four columns. Layers overlap in depth but retain a predictable reading order: header, headline/support, engine, dock.

Chosen headline:

> KNOW BEFORE YOU BID.

Supporting line:

> TenderMate turns dense tender PDFs into clear eligibility, document, risk, and deadline intelligence for Indian MSMEs.

## Tokens

- Carbon black: `#0A0A0A` — page stage and primary dark control surfaces.
- Electric lime: `#DFFF00` — primary action, live scan, focus/active state.
- Ultraviolet: `#7255FF` — spatial depth and secondary energy field.
- Paper white: `#F5F1E8` — document surface and primary text.
- Signal red: `#FF3B30` — errors and destructive/cancel emphasis only.
- Digital cyan: `#19D3FF` — source/verification details only.
- Muted carbon/paper derivatives are defined centrally as CSS variables.

## Typography

- Use the existing system stack to avoid network font dependency and layout shift.
- Hero: dense grotesk/system sans, uppercase, `clamp()` sizing, very tight tracking, 0.82–0.9 line-height.
- Interface: neutral system sans at 14–16 px.
- Technical labels: system monospace, 10–12 px, uppercase, expanded tracking.
- Headline is the largest object after the engine and remains a feature on mobile.

## Shape and depth

- Prefer sharp 2–6 px corners for document/technical surfaces.
- Use 12–18 px controlled curves only on the dock shell and menus.
- Borders are visible structural seams, not faint card outlines.
- Use one strong dock shadow, one engine depth shadow, and restrained inner glows.
- No glass-card stack; translucent effects are limited to the header and one control dock layer.

## Color allocation

- Carbon/paper provide at least 80% of the scene.
- Lime owns primary actions, active tabs, scanner beam, and selected-file readiness.
- Ultraviolet exists behind the engine and on secondary depth planes.
- Cyan marks source verification and clause coordinates.
- Red is never decorative.

## Engine visual language

- Three layered tender pages with different transforms and crop depths.
- Visible document grid, clause rows, OCR frames, registration crosses, and tender ID.
- One lime scanner beam and one moving highlight sequence.
- Status rail cycles through READING DOCUMENT, DETECTING REQUIREMENTS, CHECKING ELIGIBILITY, and SOURCE VERIFIED as ambient illustration only; no numerical or backend-processing claim.
- A screen-reader-only description states that it is a product illustration, not live analysis status.

## Legacy containment

All electric styles use `te-` classes and scoped tokens. Existing dashboard/card styles remain available and are not visually redesigned in this phase.

