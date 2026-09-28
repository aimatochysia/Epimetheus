# Motion

Two clocks. The rake drifts. A gesture answers at once. They do not share a duration.

## Easing and springs

Zen ease-out, for hover and for the grooves easing outward: `cubic-bezier(0.22, 1, 0.36, 1)`.

Settle, for hover out: `cubic-bezier(0.4, 0, 0.2, 1)`.

| Moment | Duration | Notes |
| --- | --- | --- |
| Hover in | 220ms | Shadow distance × 1.3. That stone's echo +5px |
| Hover out | 320ms | Settle both |
| Press | 120ms | Inset shadow. Warp −3px |
| Drag follow | Per frame | Position += (pointer − position) × 0.35 |
| Settle after drag | 400ms | Ease-out. No bounce |
| Rake drift | 14s cycle | 2.2px sine along the grooves. Stones stay |

A blocked drag does not bounce off the neighbor. It stops at `--gap` and stays in the hand until release.

With Motion (`motion/react`), use the durations above for the stone's transform. Keep the shadow on a class that changes at drag start. Redrawing `box-shadow` every frame flickers the extrusion. The rake is a canvas redraw, not a CSS transition.

## Hover and press

The stone's fill and shadow can live on a DOM node clipped to the silhouette, or on the canvas fill described in [contours.md](contours.md). Either way the outline used for hit testing and the outline used for the warp are the same sdf.

```css
.stone {
  transition: box-shadow 320ms var(--ease-settle);
}
.stone:hover {
  --dist: calc(var(--dist) * 1.3);
  transition-duration: 220ms;
  transition-timing-function: var(--ease-out);
}
.stone:active {
  box-shadow:
    inset var(--dist) var(--dist) var(--blur) var(--stone-shade),
    inset calc(var(--dist) * -1) calc(var(--dist) * -1) var(--blur) var(--stone-highlight);
}
.stone:focus-visible {
  outline: 2px solid var(--stone-ink);
  outline-offset: 4px;
}
```

Play the press cue on `pointerdown`, the release cue on `pointerup` when the pointer never passed the drag threshold (4px). Hover cue on `pointerenter` only when `pointerType` is not `touch`.

The second signal on hover is the groove movement, not a scale jump. Do not scale a stone past 1.01. Scaling reads as a button. This is a stone in sand.

## Drag

Pointer events. `touch-action: none`. HTML5 drag hides the shape and fights the shadow.

1. `pointerdown` inside `sdf < 0`. Record the grab offset. `setPointerCapture`. Deepen the shadow once. Play press.
2. Past 4px, start the air voice and set the state to `dragging`.
3. `pointermove`. Target = pointer minus grab offset. Position lerps 35% of the way there each frame. Propose the new lobe positions, then push the stone back along the line to its neighbor until every pairwise gap is at least `--gap`. Grooves redraw from the corrected positions.
4. The first time the gap to a neighbor falls below about `0.85 * reach`, those echoes newly share the channel. Play the bowl once. Do not repeat it while the channel stays shared. `meetK` is only how smoothly the curves join. The outlines never get that close.
5. `pointerup`. Stop the air voice. Leave the stone where the gap allows. Announce nothing if it simply rests. Announce "Stones stay apart." if the release position was corrected.
6. `Escape` returns the stone to the pointerdown position along the same lerp, without crossing another stone. Play the quiet pair.

Keyboard: the focused stone moves 8px on the arrow keys, through the same separation test. `Enter` presses it.

Labels move with the stone. They are not a second hit target.

## What the grooves do while a stone moves

Near the moving outline, grooves stay parallel to it and travel with it. In the channel, as the gap shrinks toward `--gap`, the facing grooves flatten, bow toward each other, and join into one wave. As the gap opens again, that wave splits back into two families. The join is the smooth minimum in [contours.md](contours.md). Do not lerp two pre-drawn line sets. Recompute the field.

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .stone { transition-duration: 1ms; }
}
```

Skip the drift term. Keep separation, hover warp, and the redraw on drag. Sound starts muted until the mute switch is turned on. See [sound.md](sound.md).
