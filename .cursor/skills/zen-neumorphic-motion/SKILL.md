---
name: zen-neumorphic-motion
description: >-
  Designs zen-neumorphic interfaces as a WebGL garden behind a ghost DOM.
  Stones are matte organic squircles. Raked sand is a lit height field that
  conforms to each outline and smooth-mins where ripples meet. Includes drag,
  inner-control motion, and procedural sound. Use when building or restyling
  UI, neumorphic surfaces, zen gardens, raked sand, or drag interactions.
---

# Zen Neumorphic Motion

The page is a sand garden seen from above. HTML places the blocks and receives the pointer. A full-screen WebGL canvas draws every stone, every crease, and every ripple. The two stay locked: the shader reads each block's border box and paints the rock that box implies.

## When to apply

Apply this skill for screens, components, and interaction polish in this project. Read [tokens.md](tokens.md), [engine.md](engine.md), [motion.md](motion.md), and [sound.md](sound.md) before writing CSS, the shader, or audio.

## Thesis

A karesansui garden, orthographic, one light from the top-left. Stones are heavy and embedded in the sand. Ripples are the topography around them: the same outline, stepped outward, visible only because the light strikes one face of a groove and leaves the other in shade. Where two ripples meet, a smooth minimum turns them into one wave. A band of sand, with at least one groove in it, stays between the stones.

Ma (間) is that band. Do not fill it with another object. Sound is synthesized, quiet, and paired with a visual change.

## Build order

1. Set the sand fallback, the shader's highlight and shade, and the rock colors in [tokens.md](tokens.md). Lock the light at the top-left.
2. Lay out ghost blocks in flex or grid. Give each a `data-color` and a safe zone.
3. Draw the garden with the shader in [engine.md](engine.md). Upload each block's center, size, and color from `getBoundingClientRect`.
4. Wire inner controls and stone drag as in [motion.md](motion.md). A drag moves the block. The ripple field waits. When the block has stopped, one draw reads the settled rectangles.
5. Add one shared sound bus and the cue for each gesture.
6. Honor reduced motion, contrast, focus, and a keyboard path for every drag.

## Rules

- One canvas, fixed, `z-index: 0`, `pointer-events: none`. The UI layer sits above it. Ghost blocks are transparent: no background, no border, no box-shadow.
- The rock is a squircle distorted by sine and cosine of the angle around its center, using that center as the phase so each block has its own dents. No squares, no perfect circles, no `border-radius` standing in for the rock.
- The fill is one muted earth tone, the block's `data-color`. The bevel is lighting on that single color. The surface stays matte.
- Ripples are a height field of the distance to the outline. The fragment shader shades them. They are not strokes, not SVG lines, not a second color laid on the sand.
- The nearest ripple matches the organic outline exactly. Phase the wave so it meets the perimeter.
- Combine distances with the polynomial smooth minimum before shading. Ripples assimilate. They do not cross, stack, or kink.
- Keep the smooth-minimum radius at the reference value. A larger radius eats the sand and the stones bridge. While dragging, stop before the channel's blended distance loses the groove. One visible ripple still separates the stones.
- Space the ripples at the reference period. Tighter spacing moirés.
- One light. Highlights fall on the top-left of a ridge and on the lit inner bevel. Shade falls on the bottom-right.
- No external drop shadow on a stone. Ground it with a crevice shadow a few pixels wide, exactly where the rock meets the sand, plus a soft inner darkening and a rim on the bevel.
- Content lives in the safe zone: `3rem` top and bottom, `2.5rem` left and right. Text, controls, and nested blocks stay inside that rectangle. The rectangle's corners sit inside the rock.
- Controls inside the safe zone are inset into the stone, or raised by a very small neumorphic pair. They do not use a high-contrast border.
- Body text on a stone clears 4.5:1 against `data-color`. If the reference hue is too light, darken that hex in the same hue until it passes. Text on sand uses `--ink` and clears 7:1 against the sand fallback.
- Hover, press, and drag each have a visual and a cue. Drag holds one air voice.
- A visible mute persists. `prefers-reduced-motion: reduce` drops inner transitions to 1ms and starts sound muted. The garden redraws once a block has stopped, not on each frame of the move.
- Pointer drag is the rich path. Keyboard can nudge the same block.

## Gesture grammar

| Gesture | Visual | Sound | Timing |
| --- | --- | --- | --- |
| Hover a control | Inset control darkens slightly | Soft tick, 160ms cooldown | 200ms |
| Press a control | Inset shadow deepens | Clay tap | 120ms |
| Release | Resting inset | Shorter, higher tap | 180ms |
| Drag start | Block follows the pointer. Ripples hold the resting field | Press, then the air voice | Pointer capture |
| Drag move | Heavy follow. The sand does not redraw | Air gain follows speed | Lerp 0.35 |
| Drag blocked | Block stops while one sand ripple remains between the stones | A short bowl the first time a channel is shared | Separation |
| Release drag | Block rests where the channel allows. One draw reads the settled rectangles | Air stops | 400ms settle |

Details are in [motion.md](motion.md). The field, the lighting, and the uniforms are in [engine.md](engine.md).

## Sound

Resume the context inside the first pointer or key handler. Route every cue through a master gain and a compressor. Specs are in [sound.md](sound.md).

## Composition

- The sand is the whole view. There is no card behind the garden.
- A handful of blocks, arranged in flex or grid, with a vertical offset so the row is not rigid.
- Each block is one rock. Nested tasks are DOM inside the safe zone. They are not extra rocks.
- The sand stays unlettered. Labels live on the stone.

## Accessibility checklist

- [ ] Text on each `data-color` is at least 4.5:1. `--ink` on the sand fallback is at least 7:1.
- [ ] The safe-zone corners sample inside the rock (`sd < -8`).
- [ ] Controls are real buttons, checkboxes, or switches. The inset tick is paint, not a non-focusable div.
- [ ] `:focus-visible` is a 2px ring inside the safe zone.
- [ ] A live region announces a blocked drag ("Stones stay apart.").
- [ ] Mute is a switch. Its state is persisted.
- [ ] Reduced motion: inner transitions at 1ms, sound starts muted, no idle redraw loop.
- [ ] `forced-colors`: hide the canvas, give each ghost block a solid `Canvas` background and a 1px `ButtonText` border so the UI survives without the shader.
- [ ] Hit targets follow the organic outline and are at least 56px on the shorter side.

## Leave out

- Rocks or ripples drawn in CSS, SVG strokes, or a 2D canvas.
- A spiral, concentric decorative circles, or a goo filter welding the filled bodies together.
- An external drop shadow under a stone, a glossy gradient, or a metallic highlight.
- Ripples across the interior of a stone.
- A second light direction.
- A new `AudioContext` per cue, or audio before a user gesture.
- A click sample on every pointer move.
