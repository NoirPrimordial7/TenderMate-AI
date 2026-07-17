# Electric entry visual QA

## Summary

The implemented screen reads as one dark, technical product scene rather than a marketing page. The oversized `KNOW / BEFORE / YOU BID.` composition, off-axis tender engine, electric-lime control states, and integrated dock provide the requested visual force without adding extra homepage sections, WebGL, or fake product telemetry.

## State review

| State | Visual result |
| --- | --- |
| Desktop, logged out | At 1440×900 the headline owns the left stage, the document engine bridges the composition, and the auth dock feels mechanically attached to the system rather than placed in a generic white card. |
| Desktop, logged in | The same composition activates into a secure upload dock. The authenticated greeting plus actual `plan_name` and `free_analysis_credits` values remain compact and legible. |
| Upload selected | The selected PDF becomes a dark file module with actual name/size, replace/remove controls, and a high-contrast upload action. No fabricated progress is displayed before upload bytes exist. |
| Mobile, logged out | At 390×844 the large typography remains the primary brand event. The engine simplifies, then the auth dock follows in normal document flow without horizontal clipping. |
| Mobile, logged in | The upload dock stays reachable below the engine, usage data becomes a compact two-cell readout, and Browse remains a conventional 44 px-plus action. |
| Navigation open | The mobile overlay uses a focused full-width command panel, exposes all required routes, locks background scroll, and restores focus after Escape. |

## Responsive matrix

Browser inspection covered 320×568, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1280×720, 1440×900, and 1920×1080. Every target reported equal document and viewport widths. At 1024 px and below the dock moves into normal flow; at larger widths it becomes the right-side control module. The 320 px composition keeps the headline, document, and forms readable without shrinking important controls below touch size.

## Motion and accessibility

- Standard mode uses masked headline entrance, dock crossfades, a slow CSS scanner, clause pulses, and restrained pointer depth.
- Reduced-motion emulation disables scanner, OCR, shimmer, and cycling-label animations entirely; necessary state transitions collapse to effectively immediate timing.
- Auth and upload errors use live regions, file input guidance has a programmatic description, and the visible Browse button is the sole accessible file-picker action.
- Lime, cyan, red, and violet always have text or icon/state-label support; colour is not the only signal.

## Limitations of this visual pass

The browser screenshots were generated from the local development server, so the circular Next.js development-tools control appears in captures but will not ship in the production build. Authenticated visual states used cached local QA data only; no real user, subscription, credit, or tender record was created or modified.
