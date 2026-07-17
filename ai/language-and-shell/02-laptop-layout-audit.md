# Laptop-first layout audit

## Current strengths

- The approved giant editorial headline, physical tender stack, violet/blue fields and horizontal upload dock already share a coherent visual language.
- Major content is in normal flow and the upload dock is no longer absolutely pinned.
- Width/height-aware headline clamps and reduced-motion fallbacks already exist.

## Remaining issues

- The shared container stops at 1500px and uses a 72px maximum gutter, leaving the composition smaller than intended on 1512–1920px viewports.
- `te-stage-inner` uses content minimums but does not explicitly allocate the available `100dvh - header` height between hero and dock.
- At 1366x768, document minimum height, headline minimums and dock padding compete for the same short viewport and can create avoidable scrolling.
- The wide-screen document begins at column 6 while intermediate breakpoints jump to column 7, producing an abrupt overlap change.
- The upload dock uses percentage-like fractional columns rather than the requested content-aware minimums.
- Callouts are document-relative, but several mobile/laptop positions still use unrelated fixed percentages and hide abruptly.
- The stage has separate 820px and 720px height rules but no dedicated 900px tier.

## Correction plan

- Replace the container tokens with `--page-gutter: clamp(20px, 3.4vw, 64px)` and `--page-width: min(calc(100vw - (var(--page-gutter) * 2)), 1640px)`.
- Make `.te-page-container` use the exact shared width without adding a second padding calculation.
- Treat `.te-stage-inner` as an available-height grid: hero in `minmax(0, 1fr)`, dock in content flow, safe bottom gap included.
- Keep the hero grid at 12 columns with headline 1–7 and document 7–12, allowing controlled overlap through internal translation rather than breakpoint column jumps.
- Use document-local custom properties for scale, x/y translation and callout insets.
- Use dock columns `minmax(170px,.75fr) minmax(500px,2.1fr) minmax(280px,1fr)` on full laptop widths, then collapse deliberately.
- Add 900px, 800px and 720px height tiers that adjust typography, document scale, hero gap and dock padding independently—never by scaling the entire interface.

## Primary QA viewports

1366x768, 1440x900, 1512x982, 1728x1117 and 1920x1080, measured as browser viewport sizes rather than physical display sizes.

## Implemented correction

- The shared container now uses the 1640px cap and 20â€“64px gutter without double padding.
- The stage is an available-height grid with the hero and upload dock in normal flow.
- Desktop document placement begins at column 7 and callouts remain relative to the document wrapper.
- The upload dock uses the content-aware 170/500/280px column minimums.
- Dedicated 900px, 820px and 720px height tiers reduce document height, typography and dock padding independently.
- Browser measurements at 1366x768, 1440x900 and 1512x982 returned `scrollWidth === innerWidth`; the desktop hero returned `scrollHeight === innerHeight`.
