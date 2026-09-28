---
name: zen-neumorphic-motion
description: >-
  Designs calm neumorphic zen interfaces with extruded soft surfaces, concentric
  circles, spirals, and metaball flow, plus tactile motion and procedural sound
  on hover, press, drag, and drop. Use when building or restyling UI, components,
  microinteractions, drag-and-drop, ambient motion, blobs, or interface sound.
---

# Zen Neumorphic Motion

Build interfaces that feel pressed out of one warm surface. Depth comes from a single top-left light. Geometry is circles, rings, and a slow spiral. Metaballs pool like clay and fuse when a gesture brings them together. Hover, press, drag, and drop each answer in light and in sound.

## When to apply

Apply this skill for screens, components, empty states, and interaction polish in this project. Read [tokens.md](tokens.md), [motion.md](motion.md), [metaballs.md](metaballs.md), and [sound.md](sound.md) before writing CSS, canvas, or audio. Follow those recipes. Do not invent a second visual language in the same view.

## Thesis

Ma (間) is the pause that makes the circle readable. Leave one quiet region in every view. Motion runs on two clocks: ambient cycles of several seconds, and gesture replies under a quarter second. Sound is synthesized in the browser, kept quiet, and always paired with a visual change that still makes sense on mute.

Neumorphism here means the control fill matches the page, and a light shadow plus a dark shadow extrude it or press it in. Claymorphism (a pastel body, a colored drop shadow, an inner gloss) is a different system. Do not mix the two in one view.

## Build order

1. Derive tokens from one base color. Lock the light at the top-left.
2. Place one focal circle. Add 3, 5, or 7 rings. Add at most one spiral, sharing that center.
3. Extrude controls from the page. Give each control a second signal besides the shadow.
4. Wire hover, press, drag, and drop with the gesture grammar below.
5. Add one shared sound bus and the cue for each gesture.
6. Honor reduced motion, contrast, focus, and a keyboard path for every drag.

## Rules

- One sun. Every shadow, gradient, and blob highlight agrees with a top-left light. Positive `box-shadow` offsets sit at the bottom-right and are the dark shadow.
- Control fill equals `--paper`. Depth is the shadow pair. Spread stays 0.
- Corners are full circles, or a radius from the token scale. A component uses one radius.
- Body text uses `--ink` and reaches 7:1 against `--paper`. Moss marks actions. It is not small text.
- A state change uses two signals: the shadow, plus scale, a ring, or the moss mark.
- Ambient motion stays slow and small. Gesture motion stays quick and small. No bounce, no overshoot past a few pixels.
- One metaball pool and one spiral per view. Labels, icons, and text sit outside the goo filter.
- Cues are procedural Web Audio. No audio files. One `AudioContext` for the page.
- Hover, press, drag, and drop each have a visual and a cue. Drag holds one continuous air voice. It does not click on every move.
- A visible mute persists. `prefers-reduced-motion: reduce` stills ambient motion and starts sound muted. Pressed and resting shadows still change.
- Pointer drag is the rich path. Keyboard can complete the same action.

## Surface recipe

Distance is about 10% of the control diameter. Blur is about twice the distance.

```css
.raised {
  background: var(--paper);
  color: var(--ink);
  border-radius: 50%;
  box-shadow:
    calc(var(--dist) * -1) calc(var(--dist) * -1) var(--blur) var(--highlight),
    var(--dist) var(--dist) var(--blur) var(--shade);
}
.pressed {
  box-shadow:
    inset var(--dist) var(--dist) var(--blur) var(--shade),
    inset calc(var(--dist) * -1) calc(var(--dist) * -1) var(--blur) var(--highlight);
}
```

Token math, the dawn and dusk palettes, type, and the contrast border are in [tokens.md](tokens.md).

## Gesture grammar

| Gesture | Visual | Sound | Timing |
| --- | --- | --- | --- |
| Hover in | Shadow distance +30%, scale 1.02 | Soft tick, 160ms cooldown | 220ms zen ease-out |
| Hover out | Settle to rest | Silence | 320ms |
| Press | Inset shadows, scale 0.985, one ripple | Clay tap | 120ms |
| Release | Return to hover or rest | Shorter, higher tap | 180ms |
| Drag start | Cradle goes inset; stone shadow deepens | Press, then the air voice | Pointer capture |
| Drag move | Heavy follow; a ripple every 40px; a bridge blob near a well | Air gain follows speed | Lerp 0.22 |
| Drop accept | Stone sinks; rings pulse once | Bowl partials, ~1.4s decay | 400ms settle |
| Drop reject | Return home with a short spring | Two close tones, 180ms | Stiffness 160, damping 26 |

Springs, the ring and spiral clocks, and the drag state machine are in [motion.md](motion.md).

## Geometry

- Rings: 1px strokes, opacity falling toward the outside, breathe staggered so neighbors are out of phase.
- Spiral: Archimedean, so the gap between turns stays even. Draw it once, then rotate it over 60–90s. A golden spiral only when the spiral itself is the subject, and only for about two turns.
- Metaballs: SVG goo for a DOM cluster of fewer than 8 blobs. A canvas scalar field when the pool needs soft lighting.

```js
field += (r * r) / Math.max(dx * dx + dy * dy, 0.001);
```

The shape is the set of points where `field >= 1`. Filter matrices, lighting, and performance limits are in [metaballs.md](metaballs.md).

## Sound

Resume the context inside the first pointer or key handler. Route every cue through a master gain and a compressor. Specs and a player are in [sound.md](sound.md).

## Composition

A view is a circle and the silence around it.

- The focal circle is about 40–55% of the shorter viewport edge.
- Satellites sit in one column, or on an arc, at least 55px from the focal circle.
- One short line of text, then a pause, then the circle.
- The spiral is larger than the focal circle, fainter, and shares its center.

## Accessibility checklist

- [ ] `--ink` on `--paper` is at least 7:1. A UI edge is at least 3:1, or a 1px border of `--ink` at 12% opacity is added.
- [ ] `:focus-visible` is a 2px moss ring, 4px offset. Not a glow.
- [ ] Toggles expose `aria-pressed` or `role="switch"`. A live region announces drop results.
- [ ] Mute is a switch. Its state is persisted. Color is not the only cue.
- [ ] Reduced motion: ambient clocks off, transitions at 1ms, sound starts muted.
- [ ] `forced-colors`: remove the shadow pair and use system colors.
- [ ] Circular controls are at least 56px.

## Leave out

- A second light direction on a single component.
- Text or icons inside the goo filter.
- Animating `stdDeviation`, or animating `box-shadow` on every drag frame. Move transforms. Swap shadow tokens at gesture boundaries.
- A new `AudioContext` per cue, or audio before a user gesture.
- A discrete sample on each drag pixel.
- A spiral, a full set of rings, and a blob pool all fighting in different centers. One pool, one spiral, rings around the focal circle.
