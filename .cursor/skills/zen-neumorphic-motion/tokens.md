# Tokens

The shader owns the garden's color. CSS variables are the fallback, the type, and the controls inside a stone. Components read variables. They do not invent a second palette beside `data-color`.

## Sand

The page background is the unlit fallback. The drawn sand is the shader pair in [engine.md](engine.md).

| Token | Value | Role |
| --- | --- | --- |
| `--sand` | `#dcd9d1` | Page background before WebGL, and the lost-context fallback |
| `--sand-shade` | `rgb(179, 173, 166)` | Shader shade, `(0.70, 0.68, 0.65)` |
| `--sand-highlight` | `rgb(255, 255, 250)` | Shader highlight, `(1.0, 1.0, 0.98)` |
| `--ink` | `#2c2824` | Text on sand, about 10:1 on `--sand` |
| `--ink-soft` | `#4e4942` | Kickers on sand, at least 4.5:1 |

`--ink` on `--sand` is the 7:1 floor. There is no type on the ripples.

## Stones

`data-color` is the rock. The reference hues are `#72826a` and `#8a9179`. Both fail 4.5:1 under `#f4f1ea` (about 3.6:1 and 2.9:1). Darken in the same hue until the type passes. The matching readable fills are `#64725d` and `#6a705d`, each about 4.5:1 against `--stone-ink`.

| Token | Value | Role |
| --- | --- | --- |
| `--stone` | `#64725d` | Default `data-color` when a block does not name one |
| `--stone-ink` | `#f4f1ea` | Text on a rock, at least 4.5:1 |
| `--stone-sage` | `#6a705d` | Second rock, still dark enough for `--stone-ink` |

A lighter hex from the reference is legal only on a rock with no text. Recheck before adding a label.

Do not derive a highlight color and paint it as a gradient on the fill. The bevel is the shader's diffuse and rim.

## Field

These match the shader. Changing one without the others breaks the sand bridge or the moiré floor.

| Token | Value | Role |
| --- | --- | --- |
| `--radius` | `0.45 × shorter half-side` | Squircle corner |
| `--dent` | `0.08` and `0.04` of the shorter half-side | Sine and cosine amplitude |
| `--smin` | `20px` | Polynomial smooth-minimum radius |
| `--wave` | `36px` | Ripple period |
| `--mask` | `12px` | Distance over which a groove fades in off the seam |
| `--crevice` | `6px` | Ambient occlusion on the sand side of the seam. Stay in 6–10px |
| `--bevel` | `20px` | Width of the inner rise |
| `--elevation` | `3` | Height of the flat top, in the shader's units |
| `--bridge` | `12px` | Minimum blended distance in a channel while dragging |
| `--safe-y` | `3rem` | Safe-zone padding, block axis |
| `--safe-x` | `2.5rem` | Safe-zone padding, inline axis |

## Controls inside a stone

Inset, lit from the top-left. Spread stays 0. This is the only shadow. Every `box-shadow` on a control, a rounded container, a menu, or a stone begins with `inset`. There is no outer shadow and no raised pair.

```css
--shadow-inset: inset 3px 3px 6px rgba(0, 0, 0, 0.15),
                inset -2px -2px 4px rgba(255, 255, 255, 0.1);
```

Pressing deepens the same inset. It does not add a second, outer layer. Hover darkens the inset fill. A completion glow, if one is needed, is an inset ring.

## Contrast

```js
function lin(c) {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}
function contrast(rgbA, rgbB) {
  const L = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const [hi, lo] = [L(rgbA), L(rgbB)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}
```

Run it on every `data-color` against `--stone-ink` before shipping the block.

## Type

UI face: system sans, the same stack as the reference (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`). Titles at `1.4rem`, weight 400. Task copy at `1rem`, weight 400. Sentence case.

## Theme shell

```css
:root {
  --sand: #dcd9d1;
  --ink: #2c2824;
  --ink-soft: #4e4942;
  --stone: #64725d;
  --stone-sage: #6a705d;
  --stone-ink: #f4f1ea;
  --safe-y: 3rem;
  --safe-x: 2.5rem;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-settle: cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--ink);
  background: var(--sand);
}
```

Dusk keeps the same light vector. Retune `--sand`, the shader shade and highlight, and every `data-color` together, then rerun contrast. Do not flip the light to the bottom-right.

## High contrast and forced colors

```css
@media (prefers-contrast: more) {
  :root { --ink: #16130f; --stone: #3f4a3a; --stone-ink: #f7f4ee; }
}
@media (forced-colors: active) {
  #glcanvas { display: none; }
  .zen-block {
    background: Canvas;
    color: CanvasText;
    border: 1px solid ButtonText;
    box-shadow: none;
  }
}
```
