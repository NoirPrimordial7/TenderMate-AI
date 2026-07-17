# Electric motion system

## Technique

- Add the `motion` package and use `motion/react` for state orchestration, presence, layout changes, and the initial scene reveal.
- Use CSS keyframes for the perpetual scanner, grid pulse, and status cycling because they are lightweight and compositor-friendly.
- Do not add GSAP or WebGL.

## Initial choreography

1. Header fades and translates down over 320 ms.
2. Product label appears over 260 ms.
3. Each headline line reveals through an overflow mask over 700–820 ms with 70 ms stagger.
4. Engine settles from scale 0.94, `translateY(28px)`, and slight rotation over 820 ms.
5. Dock enters from the right/foreground over 520 ms after the headline has established hierarchy.

Use cubic-bezier curves equivalent to ease-out-quart/expo. No bounce or elastic response.

## Ambient engine

- Scanner loop: 7.2 seconds with a long rest, transform/opacity only.
- Status label cycle: 9.6 seconds with crossfades, no implied backend state.
- OCR highlight: 5–7 second alternating opacity/transform sequence.
- Desktop pointer depth: requestAnimationFrame is not needed; use Motion values driven by pointer events on the stage, capped at ±6 px and reset on leave.
- Disable pointer depth below 1024 px and on coarse pointers.

## Authentication and activation

- Mode switch: 280–360 ms sliding lime indicator plus an `AnimatePresence` fade/translate of form content.
- Successful auth on the homepage: dock crossfades/morphs to upload, engine glow/scan intensity briefly increases, and headline scale/position adjusts only where layout space requires it.
- `/login` and `/signup` preserve their redirect behavior, so activation may transition into route navigation.

## Upload feedback

- Drag-over: 220 ms border/background/inner-grid response.
- Selected file: 300 ms enter with opacity and 10 px vertical movement.
- Real byte progress: linear bar updates from XHR `progress`; show a number only when `lengthComputable` supplies actual total bytes.
- Success: 360 ms lime confirmation state, then the existing redirect to `/tender/{tender_id}`.
- Cancellation returns to the selected-file state without losing the file.

## Reduced motion

When `prefers-reduced-motion: reduce`:

- Remove scanner movement, status cycling, parallax, shimmer, blur, and staged headline masks.
- Render the scene in its final state immediately.
- Retain only near-instant state changes necessary to communicate mode, menu, upload progress, and success.
- Never hide or delay content pending animation.

## Performance constraints

- Transform and opacity only for animated composition.
- No React state updates on scroll; there is no scroll choreography.
- Avoid animating layout dimensions; use layout-presence transitions sparingly around the dock.
- Keep SVG/DOM geometry static and CSS-driven.
- The mobile engine removes rear planes and pointer depth.

