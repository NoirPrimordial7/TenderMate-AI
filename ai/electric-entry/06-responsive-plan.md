# Responsive plan

## Desktop — 1280×720, 1440×900, 1920×1080

- Header remains one line with active nav and account/auth controls.
- Stage targets `100svh` but may grow when signup or error states require it.
- Headline occupies the left/top field; engine overlaps the middle; dock anchors right.
- At 1280×720, reduce headline and engine scale before reducing form usability.
- At 1920×1080, cap the stage width and keep the composition dense rather than stretching gaps.

## Compact landscape — 1024×768

- Keep a two-zone composition but reduce engine depth and hide secondary technical labels.
- Dock remains at least 360 px when available.
- Header switches to the mobile menu if desktop links cannot retain 44 px targets.

## Tablet — 768×1024

- Headline spans full width at the top.
- Engine sits behind/between headline and dock with reduced opacity/depth.
- Dock becomes a full-width powered module below the headline/engine overlap.
- No pointer parallax.

## Mobile — 320×568, 360×800, 390×844, 430×932

- Header uses brand plus one 44 px menu button.
- Headline remains oversized but uses three deliberate lines and safe `clamp()` sizing.
- Supporting copy stays at 15–16 px.
- Engine is simplified: front paper, one rear plane, scanner, and two OCR labels; no off-canvas floating tags.
- Dock follows immediately and is never blocked by the decorative object.
- On 320×568 the page may scroll vertically; no artificial viewport clipping.
- Signup form density tightens through spacing, not smaller controls or text.

## Zoom and overflow

- Use `min-width: 0`, `overflow-wrap`, and viewport-aware menu widths.
- Important controls are at least 44×44 px.
- Use `100svh` with `100dvh` enhancement; never hard-lock body height.
- At 200% zoom, the layout resolves into the mobile/tablet flow and remains operable.
- No horizontal scroll at any required viewport.

## Responsive verification matrix

For every required size verify: header, headline line breaks, engine crop, dock reachability, form fields, errors, selected file, menus, and no horizontal overflow.

