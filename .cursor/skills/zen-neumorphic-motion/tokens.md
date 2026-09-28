# Tokens

Derive every color from one paper hex. Components read variables. They do not invent hex values.

## Dawn and dusk

Dawn is the default. Dusk is the same light direction on a dark paper. Switch by setting `data-theme="dusk"` on the root. Do not invert shadows by hand.

| Token | Dawn | Dusk | Role |
| --- | --- | --- | --- |
| `--paper` | `#e6dfd4` | `#2a2724` | Page and control fill |
| `--highlight` | `#f7f3ec` | `#3a3632` | Top-left shadow |
| `--shade` | `#c9bfb2` | `#161412` | Bottom-right shadow |
| `--ink` | `#2c2824` | `#f3eee6` | Text, 7:1 on paper |
| `--ink-soft` | `#4e4942` | `#c9c0b4` | Labels and kickers, at least 4.5:1 |
| `--moss` | `#3e4a37` | `#c5d4b8` | Focus, action mark |
| `--clay` | `#d2c3b0` | `#4a4038` | Metaball body |

`--moss` above is darkened for strokes and any text. A lighter moss fill for a large mark (at least 24px) may use dawn `#5d6e52` or dusk `#a3b396`. Run the contrast check before using the lighter moss on paper.

## Derivation

From paper HSL `(h, s, l)`:

- Dawn (`l >= 0.45`): highlight is `l + 0.10`, saturation pulled down slightly. Shade is `l - 0.14`. Ink is a warm near-black at lightness `0.16`. If ink-on-paper is under 7:1, push ink darker until it passes.
- Dusk (`l < 0.45`): highlight is only a small step lighter (`l + 0.08`, capped near `0.22`). Shade is `l - 0.12`. Ink is warm off-white. If contrast is under 7:1, push ink lighter.

Keep highlight and shade in the same hue family as paper. A blue shadow on a warm page breaks the material.

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

If the shade-to-paper or highlight-to-paper contrast is under 3:1, add a fallback edge:

```css
border: 1px solid color-mix(in srgb, var(--ink) 12%, transparent);
```

## Shadow scale

| Token | Value | Use |
| --- | --- | --- |
| `--dist-sm` | `6px` | Controls near 56px |
| `--dist` | `10px` | Default orbs and wells |
| `--dist-lg` | `16px` | The focal circle |
| `--blur` | `calc(var(--dist) * 2)` | Always paired with the distance in use |

Hover multiplies distance by 1.3. Press uses the resting distance, inset. Spread stays 0. A non-zero spread reads as a sticker.

Optional convex face, only on the primary stone, aligned with the light:

```css
background: linear-gradient(145deg, var(--highlight), var(--paper) 42%, var(--shade));
```

Flat `--paper` is the default. Skip the gradient on ordinary controls.

## Space, radius, type

Space follows a short Fibonacci set: `8, 13, 21, 34, 55, 89`. Group padding and the gap between satellites come from this set. The quiet region of a view is at least `89px` on desktop and `55px` on a narrow screen.

| Radius | Value |
| --- | --- |
| Orb, stone, pool | `50%` |
| Rare panel | `28px` or `40px` |

Type:

- Titles: `"Fraunces", "Iowan Old Style", Palatino, Georgia, serif`. Weight 460. Size `clamp(2rem, 4vw, 3.25rem)`. Sentence case.
- UI: `"Outfit", system-ui, sans-serif`. Weight 300–420.
- Kickers: UI face, 11–12px, `letter-spacing: 0.18em`, uppercase, `--ink-soft`.

Selection: `background: color-mix(in srgb, var(--moss) 25%, var(--paper))`.

## Theme shell

```css
:root {
  --paper: #e6dfd4;
  --highlight: #f7f3ec;
  --shade: #c9bfb2;
  --ink: #2c2824;
  --ink-soft: #4e4942;
  --moss: #3e4a37;
  --clay: #d2c3b0;
  --dist: 10px;
  --blur: calc(var(--dist) * 2);
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-settle: cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--ink);
  background: var(--paper);
}
:root[data-theme="dusk"] {
  --paper: #2a2724;
  --highlight: #3a3632;
  --shade: #161412;
  --ink: #f3eee6;
  --ink-soft: #c9c0b4;
  --moss: #c5d4b8;
  --clay: #4a4038;
}
```

## High contrast and forced colors

```css
@media (prefers-contrast: more) {
  :root { --shade: #8a7f72; --moss: #24301f; }
}
@media (forced-colors: active) {
  .raised, .pressed {
    background: Canvas;
    color: CanvasText;
    border: 1px solid ButtonText;
    box-shadow: none;
  }
}
```
