# Motion

The garden is still until a person acts. A gesture answers in under a quarter second. Ripples do not drift on their own, and they do not follow a block that is still in motion. They are drawn again from the rectangles once that motion has stopped.

## Easing

Zen ease-out: `cubic-bezier(0.22, 1, 0.36, 1)`.

Settle: `cubic-bezier(0.4, 0, 0.2, 1)`.

| Moment | Duration | Notes |
| --- | --- | --- |
| Hover a control | 200ms | Inset fill darkens. The rock's outline stays |
| Hover out | 320ms | Settle |
| Press | 120ms | Inset shadow deepens |
| Drag follow | Per frame | Offset += (pointer − offset) × 0.35 |
| Settle after drag | 400ms | Ease-out. No bounce |

A blocked drag does not bounce. It stops at the sand bridge and stays in the hand until release.

Do not scale a block. Scaling reads as a button. This is a stone in sand.

## Controls

Hover and press belong to the controls inside the safe zone, not to the rock.

```css
.task { transition: background 200ms var(--ease-out); }
.task:hover { background: rgba(0, 0, 0, 0.15); }
.task:active {
  box-shadow:
    inset 4px 4px 8px rgba(0, 0, 0, 0.22),
    inset -1px -1px 3px rgba(255, 255, 255, 0.08);
}
.task:focus-visible {
  outline: 2px solid var(--stone-ink);
  outline-offset: 3px;
}
```

Play the press cue on `pointerdown`, the release cue on `pointerup` when the pointer never passed the drag threshold (4px). Hover cue on `pointerenter` only when `pointerType` is not `touch`.

`pointerdown` on a control does not start a stone drag. The control keeps the event.

## Drag

Pointer events on the ghost block. `touch-action: none`. HTML5 drag hides the element and fights the shader.

1. `pointerdown` on the block, with the target outside a control, and only where `sdOrganicRock < 0`. Record the grab offset from the block's center. `setPointerCapture`. Play press.
2. Past 4px, start the air voice and set the state to `dragging`.
3. `pointermove`. The target translation is the pointer minus the grab. The rendered translation lerps 35% of the way there each frame, applied as `translate3d` on the ghost block.
4. Run the drag guard from [engine.md](engine.md). If the channel midpoint's blended distance is under 12px, push this block back along the line of centers until the sample clears. Leave the ripple field on its last settled draw.
5. The first time the outline gap to a neighbor falls below one wave period (36px), the ripples share a channel. Play the bowl once. Do not repeat it while that channel stays shared.
6. `pointerup`. Stop the air voice. Leave the block where the guard allows. After the settle, read every `getBoundingClientRect`, upload bounds and colors, and `drawArrays` once. Announce nothing if it simply rests. Announce "Stones stay apart." if the release position was corrected.
7. `Escape` returns the block to the pointerdown translation along the same lerp, still obeying the guard. Play the quiet pair.

Keyboard: the focused block moves 8px on the arrow keys, through the same guard. `Enter` activates the first control inside it.

The safe zone moves with the block. It is not a second hit target. The canvas never receives the pointer.

While the lerp or the return is in flight, do not redraw the sand. When every block is resting, draw once and stop. The ripples hold that frame.

## What the ripples do while a block moves

They stay as they were. The block's own surface may follow the pointer. The topographic field does not. When the gesture or the layout animation ends, one upload reads the settled rectangles and draws the same shader. Beside each resting outline the nearest groove matches that outline. In a channel the grooves assimilate through the smooth minimum. Do not blend two stored images of the sand.

## Rounded containers

A screen that asks for separate rounded containers, rather than organic stones, keeps those containers apart. Their rounded rectangles are the ripple outlines. The period, the smooth minimum, and the single top-left light stay as in [engine.md](engine.md). Nested rows sit inside a container and do not each cast a ripple. Those containers may carry a soft neumorphic pair, highlight toward the top-left and shade toward the bottom-right, because they are the UI surface rather than a garden stone. The ripple field still updates only after they have stopped moving.

## Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .task { transition-duration: 1ms; }
}
```

Skip the drag lerp and apply the guarded position directly. Sound starts muted until the mute switch is turned on. See [sound.md](sound.md).
