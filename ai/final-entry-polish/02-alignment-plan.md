# Entry alignment plan

## Shared page system

Introduce shared variables in `:root`:

- `--page-max-width: 93.75rem` (1500px)
- `--page-gutter: clamp(1.25rem, 4vw, 4.5rem)`
- `--header-height: 4.75rem`
- `--hero-gap` and `--section-gap` as responsive spacing tokens

Create `.te-page-container` as the only horizontal alignment primitive. Header, stage grid, CTA row and upload dock use it directly.

## Hero flow

1. Keep scene-level grain and opening wipe as stage decorations.
2. Move violet, blue and orange geometry inside a bounded document stage.
3. Build `.te-hero-layout` as a 12-column grid in normal flow.
4. Put copy across columns 1-8 and document across columns 6-12 on wide screens, creating a controlled overlap that relaxes to columns 7-12 at laptop widths.
5. Keep the CTA/action row and authenticated dock below the top grid in normal flow.
6. Use `min-height` and content-driven height rather than an absolute bottom anchor.

## Headline

- Use explicit line wrappers and a width-and-height-aware size: `clamp()` with `min(vw, vh)`.
- Increase line-height to a controlled `0.80-0.84` where needed to prevent glyph clipping.
- Give essential text a foreground layer while allowing selected decorative portions to sit behind the document.
- Use state-specific maximums and short-height overrides at 820px and 720px.
- Preserve the existing masked entrance and coloured second line.

## Document stage

- Give the document region a stable `aspect-ratio` and internal coordinate system.
- Scale the entire stack from the centre through one responsive custom property.
- Keep pages and callouts anchored within a safe inset.
- Preserve the physical page styling, scanner and selected-file reaction.
- Clamp all decorative overflow inside the stage so it never creates horizontal scrolling.

## CTA and dock

- Logged-out CTA becomes an action row aligned to the container and document edge.
- Authenticated dock spans the same page container with 22% / minmax(0, 50%) / 28% proportions.
- Dock keeps 24-40px bottom safe space and stacks predictably at tablet/mobile widths.

## Auth sheet

- Preserve the colour field and sheet motion.
- Add a single `.te-auth-content-container` of approximately 520px.
- Align top controls and form content to the same internal inset.
- Vertically centre the form only when height allows; use scrolling and compact gaps on short screens.

## Header

- Replace its local max-width/gutters with `.te-page-container` variables.
- Keep a stable header height and non-shifting active underline.
- Preserve existing menu focus, outside-click, Escape and body-scroll behavior.
