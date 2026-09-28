# Motion

Two clocks. Ambient motion is a breath. Gesture motion is a touch. They do not share a duration.

## Easing and springs

Zen ease-out, for hover in, ripple, and entrances: `cubic-bezier(0.22, 1, 0.36, 1)`.

Settle, for hover out: `cubic-bezier(0.4, 0, 0.2, 1)`.

| Moment | Duration | Notes |
| --- | --- | --- |
| Hover in | 220ms | Ease-out. Scale 1.02. Distance × 1.3 |
| Hover out | 320ms | Settle. Longer than the entrance |
| Press | 120ms | Scale 0.985. Swap to inset |
| Ripple | 800ms | One ring, opacity 0.35 → 0, scale 1 → 1.35 |
| Drop settle | 400ms | Ease-out into the well |
| Ring breathe | 8s | Scale 1 → 1.018 → 1, ease-in-out, infinite |
| Spiral rotation | 72s | Linear, after a 2.4s draw-on |
| Blob drift | 9–14s | Amplitude under 12% of the pool |

Return-home spring, when a drop is rejected: stiffness `160`, damping `26`, mass `1.1`. The stone may travel a few pixels past the cradle, then rest. Do not use a snappy UI spring (stiffness 400, damping 12). That reads as a toy.

With Motion (`motion/react`), map the same numbers. Keep shadow changes in CSS. Interleave a shadow animation on every frame and the extrusion flickers.

```jsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.985 }}
  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
/>
```

Buttons can stay on CSS. Use `:hover`, `:active`, and `:focus-visible`. Reach for a library when a gesture needs velocity: drag, shared layout, or the return spring.

## Hover, press, ripple

```css
.orb {
  transition:
    transform 320ms var(--ease-settle),
    box-shadow 320ms var(--ease-settle);
}
.orb:hover {
  transform: scale(1.02);
  --dist: 13px;
  transition-duration: 220ms;
  transition-timing-function: var(--ease-out);
}
.orb:active {
  transform: scale(0.985);
  box-shadow:
    inset var(--dist) var(--dist) var(--blur) var(--shade),
    inset calc(var(--dist) * -1) calc(var(--dist) * -1) var(--blur) var(--highlight);
}
.orb:focus-visible {
  outline: 2px solid var(--moss);
  outline-offset: 4px;
}
```

A ripple is a child circle, `pointer-events: none`, centered on the pointer inside the control. Restart its animation by removing and re-adding the class. Play the press cue on `pointerdown`, the release cue on `pointerup`. Hover cue on `pointerenter` only when `pointerType` is not `touch`, with the cooldown in [sound.md](sound.md).

The second signal: a 6px moss dot, or a 1px moss ring inset 8px, on any control that is only a circle. Resting and pressed must differ by shadow and by that mark (the mark fills on press, or the dot scales to 0.6).

## Rings

Use an odd count: 3, 5, or 7. Stroke 1px. `vector-effect: non-scaling-stroke` if the SVG scales. Opacity is about `0.28 - i * 0.03`.

```css
.ring {
  fill: none;
  stroke: var(--ink);
  stroke-width: 1;
  transform-origin: center;
  transform-box: fill-box;
  animation: breathe 8s var(--ease-settle) infinite;
  animation-delay: calc(var(--i) * -0.8s);
}
@keyframes breathe {
  50% { transform: scale(1.018); }
}
```

The stagger is negative so the wave is already moving on first paint. Neighbors must not peak together.

An ensō, when a single brush circle is the mark: a circle with `pathLength="1"`, `stroke-dasharray: 0.92 0.08`, `stroke-linecap: round`, opacity near 0.4. It stays open. Do not close the gap.

## Spirals

Archimedean, even gap between turns. Polar form `r = a + bθ`, with θ in radians. The gap between turns is `2πb`. For an ornament around the focal circle, use about 2.5–3.5 turns and a gap of 14–22px. Stroke 1px, ink at about 22% opacity, `stroke-linecap: round`.

```js
function archimedeanPath(cx, cy, a, b, turns, steps = 480) {
  const max = turns * Math.PI * 2;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * max;
    const r = a + b * theta;
    const x = cx + Math.cos(theta) * r;
    const y = cy + Math.sin(theta) * r;
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}
```

Draw-on, once, then a slow spin of the whole path. Set `pathLength="1"` on the `<path>` (an SVG attribute, not a CSS property) so the dash does not depend on path length.

```css
.spiral {
  fill: none;
  stroke: color-mix(in srgb, var(--ink) 22%, transparent);
  stroke-width: 1;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw 2.4s var(--ease-out) forwards;
  transform-origin: center;
}
@keyframes draw { to { stroke-dashoffset: 0; } }
.spiral-spin { animation: spin 72s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

The path is visible without the draw animation (set `stroke-dashoffset: 0` inside reduced motion). A golden spiral, `r = a * e^(0.30635θ)` with `0.30635 = ln(φ) / (π/2)`, grows by φ every quarter turn. Cap it near two turns or it leaves the circle. Use it only as the subject of the view, not as a background texture.

Center the spiral on the focal circle. It is larger than the rings and fainter. It does not sit behind a paragraph of text.

## Drag and drop

Use pointer events. HTML5 drag-and-drop hides the ghost and fights the shadow. The stone is `touch-action: none`.

States: `rest`, `dragging`, `settled`, `returning`.

1. `pointerdown` on the stone. `setPointerCapture`. Record the grab offset. Cradle swaps to inset. Stone swaps to the deep raised shadow once. Play press, then start the air voice. If the pointer is a keyboard activation (`Enter` or Space), skip to the accept animation toward the primary well.
2. `pointermove`. Position is `previous + (pointer - previous) * 0.22`, so the stone lags like a weight. Feed speed in px/s to the air voice. Every 40px of travel, spawn a ripple at the stone: a circle, 800ms, opacity 0.28 to 0, then remove the node.
3. While the distance from stone center to a well center is under `wellRadius + stoneRadius`, inject a bridge blob into that well's pool. Its radius lerps from 8px to the stone radius as the stone approaches. This is the merge, before the drop.
4. `pointerup` inside a well (center distance under `wellRadius * 0.72`): hide the DOM stone, add a permanent blob of the same radius, pulse the rings once (scale 1.04, opacity up, 600ms), play the bowl, set `settled`. Announce "Stone placed in the pool."
5. `pointerup` outside: stop the air voice, play the reject cue, spring the stone to the cradle, cradle returns to rest, announce "Stone returned."
6. `Escape` during a drag takes the reject path. A second activation on a settled stone lifts it back to the cradle.

The bridge blob and the stone share the pool's center coordinate space. Convert page coordinates by the pool's `getBoundingClientRect`.

Keyboard: the stone is a button with `aria-roledescription="draggable stone"`. A polite live region reports the result. Do not rely on drag events for the only path.

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .ring, .spiral, .spiral-spin { animation: none; }
  .spiral { stroke-dashoffset: 0; }
  .orb { transition-duration: 1ms; }
}
```

Stop the blob drift clock. Keep shadow swaps for press and drop. Sound starts muted; the mute switch can turn it on. See [sound.md](sound.md).
