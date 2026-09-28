---
name: zen-neumorphic-motion
description: >-
  Designs top-down zen-garden interfaces: neumorphic sand and separated stones,
  with raked depth lines that follow each stone's silhouette and merge like
  waves where they meet. Includes tactile motion and procedural sound on hover,
  press, and drag. Use when building or restyling UI, gardens, contour lines,
  neumorphic surfaces, drag interactions, or interface sound.
---

# Zen Neumorphic Motion

Build a top-down garden. The page is raked sand. Stones and planted masses sit in it, apart from each other, extruded by one top-left light. Around every stone, depth lines repeat its silhouette. Where those lines meet, they bend and join into one wave. They do not cross, and the stones never do that job for them.

## When to apply

Apply this skill for screens, components, and interaction polish in this project. Read [tokens.md](tokens.md), [contours.md](contours.md), [motion.md](motion.md), and [sound.md](sound.md) before writing CSS, canvas, or audio.

## Thesis

A karesansui garden, seen from directly above. Sand is one continuous material. Each stone or grove is a separate mass with a gap of bare sand around it. The rake is a family of grooves whose path is the stone's outline, stepped outward. Far from any mass the grooves are quiet parallel waves. Close to a mass they hug its edge. In the channel between two masses the two influences add, so the grooves change shape and become one shared wave.

Ma (間) is the sand between stones. Do not fill it with another object. Motion has two clocks: the rake drifts over several seconds, and a gesture answers in under a quarter second. Sound is synthesized, quiet, and paired with a visual change.

Neumorphism is the depth of that material. Sand and stone share one light. Grooves are incised. Stones are raised. Claymorphism (a pastel body, a colored drop shadow, an inner gloss) is a different system. Do not mix the two in one view.

## Build order

1. Set sand, stone, and groove tokens. Lock the light at the top-left.
2. Place stones with a real gap between their outlines. Give each one closed silhouette.
3. Build the rake from those silhouettes, using the height field in [contours.md](contours.md). Draw sand and grooves first, stones after, so a stone covers the rake.
4. Wire hover, press, and drag. Dragging a stone recomputes the rake. The lines are what merge.
5. Add one shared sound bus and the cue for each gesture.
6. Honor reduced motion, contrast, focus, and a keyboard path for every drag.

## Rules

- Orthographic. No perspective tilt, no isometric stack, no stone drawn on top of another stone.
- Outlines of different stones stay at least `--gap` apart (72px). Only grooves enter that channel.
- One sun. Highlight is top-left, shade is bottom-right. Spread on a shadow stays 0.
- Sand is `--paper`. Stones are moss masses, a second material, still lit by that same sun. Derive each stone's highlight and shade from its own fill.
- Grooves are incisions in the sand: a hairline shade offset down-right, a hairline highlight offset up-left. They are texture, not borders around the stone.
- The nearest grooves follow the stone's silhouette. They are not circles, not a spiral, and not a field of dots.
- Where two stones' influences meet, combine the field before drawing. The resulting groove is one curve. It does not cross its neighbor and it does not kink along a hard seam.
- Body text sits on a stone and clears 4.5:1 against that stone. Text on sand uses `--ink` and clears 7:1 against `--paper`. Do not put text on the grooves.
- A state change uses two signals. A lifted stone changes its shadow and its nearest grooves.
- Hover, press, and drag each have a visual and a cue. Drag holds one air voice.
- A visible mute persists. `prefers-reduced-motion: reduce` stills the rake's drift and starts sound muted. Pressed and resting shadows still change.
- Pointer drag is the rich path. Keyboard can nudge the same stone.

## Surface recipe

Sand is flat `--paper`. A stone is raised. Distance is about 8% of the stone's shorter side. Blur is about twice the distance.

```css
.stone {
  background: var(--stone);
  color: var(--stone-ink);
  box-shadow:
    calc(var(--dist) * -1) calc(var(--dist) * -1) var(--blur) var(--stone-highlight),
    var(--dist) var(--dist) var(--blur) var(--stone-shade);
}
.stone:active {
  box-shadow:
    inset var(--dist) var(--dist) var(--blur) var(--stone-shade),
    inset calc(var(--dist) * -1) calc(var(--dist) * -1) var(--blur) var(--stone-highlight);
}
```

The visible edge of a stone is its real silhouette, not a rounded rectangle sitting behind an organic graphic. Token values are in [tokens.md](tokens.md). The groove and field math are in [contours.md](contours.md).

## Gesture grammar

| Gesture | Visual | Sound | Timing |
| --- | --- | --- | --- |
| Hover in | Shadow distance +30%. Nearest grooves ease outward about 5px | Soft tick, 160ms cooldown | 220ms zen ease-out |
| Hover out | Grooves and shadow settle | Silence | 320ms |
| Press | Inset shadow. Nearest grooves pull in about 3px | Clay tap | 120ms |
| Release | Return to hover or rest | Shorter, higher tap | 180ms |
| Drag start | Stone shadow deepens once. Rake starts following | Press, then the air voice | Pointer capture |
| Drag move | Heavy follow. Grooves reflow every frame and merge in the channel | Air gain follows speed | Lerp 0.35 |
| Drag blocked | Stone stops at `--gap`. Grooves stay merged in the channel | A short bowl when a shared wave first forms | Separation, not overlap |
| Release drag | Stone settles where the gap allows | Air stops. Bowl if a merge completed, otherwise the quiet pair | 400ms settle |

Details are in [motion.md](motion.md).

## The rake

```js
const d = smoothMinDistance(stones, x, y, meetK);
const outside = Math.max(0, d);
const along = flowY + flowX * 0.08;
const w = falloff(outside);
const h = (1 - w) * along + w * (outside * 1.15 + along * 0.2);
```

Draw isolines of `h`. Near a stone, `w` is 1 and the grooves are a projection of its silhouette. Far away, `w` is 0 and they are the long rake. `smoothMinDistance` is what makes two families into one wave. Full recipe, the marching-squares pass, and the groove stroke are in [contours.md](contours.md).

## Sound

Resume the context inside the first pointer or key handler. Route every cue through a master gain and a compressor. Specs are in [sound.md](sound.md).

## Composition

- The sand is the whole view. There is no card behind the garden.
- Three to seven stones. Scatter them. Leave a channel of at least `--gap` between every pair.
- One mass may be a grove: lighter moss, little or no text. Readable stones are darker so their type clears 4.5:1.
- Grooves run under the whole sand and stop at each silhouette.
- One short label lives on a stone. The sand stays unlettered except a single kicker if the view needs a name.

## Accessibility checklist

- [ ] `--ink` on `--paper` is at least 7:1. Text on a stone is at least 4.5:1.
- [ ] The stone's moss fill is a second signal beside its shadow.
- [ ] `:focus-visible` is a 2px light ring, 4px outside the silhouette.
- [ ] Toggles expose `aria-pressed` or `role="switch"`. A live region announces a blocked drag ("Stones stay apart.").
- [ ] Mute is a switch. Its state is persisted.
- [ ] Reduced motion: rake drift off, transitions at 1ms, sound starts muted. Grooves still update when a stone is moved.
- [ ] `forced-colors`: drop the shadow pair, keep a 1px solid edge on each stone.
- [ ] Hit targets follow the silhouette and are at least 56px on the shorter side.

## Leave out

- Stones overlapping, stacked, or sharing an edge. The second reference's piled blobs are not the layout.
- A spiral, a set of decorative circles, or a metaball as the rake.
- Grooves drawn across a stone's interior.
- Hard Voronoi seams (a sharp crease where two distance fields meet). Soften the join.
- A second light direction.
- Animating `box-shadow` on every drag frame. Swap the shadow token when the drag starts. Move the stone. Redraw grooves.
- A new `AudioContext` per cue, or audio before a user gesture.
- A click sample on every pointer move.
