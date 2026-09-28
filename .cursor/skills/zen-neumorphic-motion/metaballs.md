# Metaballs, pools, and light

A metaball pool is filled clay, not a sticker. The silhouette is one body. The top-left of that body carries the same light as the controls.

## Choose a renderer

| Situation | Renderer |
| --- | --- |
| DOM chips or a drag ghost joining a cluster, under 8 blobs, no custom lighting | SVG goo |
| A lit pool, more blobs, or a field the pointer paints | Canvas scalar field |
| Rings, an ensō, a spiral | Plain SVG. No filter |

One pool per view. Keep it near the focal circle, usually clipped to that circle.

## Scalar field

Jim Blinn's form. For each ball of radius `r` at `(cx, cy)`:

```js
field += (r * r) / Math.max((x - cx) ** 2 + (y - cy) ** 2, 0.001);
```

The clay is where `field >= 1`. Two balls merge when their falloff overlaps enough to cross 1 between them. A bridge blob during drag is just another term in the sum.

Marching squares traces an outline of this field. Use it only for a hairline contour. Filled clay is the thresholded field, not a polyline.

The gradient points inward (field is highest at a center). The outward normal is the negated, normalized gradient. With one ball it matches the geometric normal, pointing away from the center.

```js
function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
```

Antialias the edge with `smoothstep(0.85, 1.08, field)` as alpha. A hard step stairs on 1x displays.

## Canvas lighting

Light direction toward the sun: `L = normalize(-1, -1)`. Diffuse is `max(0, dot(outwardNormal, L))`. Map that from `--shade` in the shadow to `--highlight` on the lit face, with `--clay` as the mid color. The lit face is the upper left.

```js
function paintPool(ctx, balls, w, h) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const Lx = -0.7071, Ly = -0.7071;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let field = 0, gx = 0, gy = 0;
      for (const b of balls) {
        const dx = x - b.x, dy = y - b.y;
        const inv = 1 / Math.max(dx * dx + dy * dy, 0.25);
        field += b.r * b.r * inv;
        const g = -2 * b.r * b.r * inv * inv;
        gx += g * dx;
        gy += g * dy;
      }
      if (field < 0.75) continue;
      const alpha = smoothstep(0.85, 1.08, field);
      const mag = Math.hypot(gx, gy) || 1;
      const nx = -gx / mag, ny = -gy / mag;
      const lit = 0.35 + 0.65 * Math.max(0, nx * Lx + ny * Ly);
      const i = (y * w + x) * 4;
      d[i] = 190 + (247 - 190) * lit;
      d[i + 1] = 180 + (243 - 180) * lit;
      d[i + 2] = 166 + (236 - 166) * lit;
      d[i + 3] = alpha * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
```

Those RGB endpoints are dawn shade `(190, 180, 166)` and highlight `(247, 243, 236)`. On dusk, swap in the dusk pair. Put a CSS `drop-shadow(12px 16px 18px color-mix(in srgb, var(--shade) 70%, transparent))` on the canvas so the whole silhouette sits in the page light. Do not also draw a second shadow inside the shader.

Drift with two slow sines of different periods, amplitude under 12% of the pool. Pause the frame loop when the canvas is offscreen (`IntersectionObserver`) or the document is hidden.

Budget: cap the buffer at the CSS pixel size of the pool, and cap `devicePixelRatio` at 1.5 only if the pool is under about 420px. Above that, paint at CSS pixels. Skip samples outside the union of balls expanded by `1.4r`. A 400×400 pool with 4 balls is the comfortable case. If a frame runs long, paint at half resolution and upscale with smoothing.

## SVG goo

Blur the blobs, then crush the alpha so the overlap becomes a meniscus. The filter's input must be the blobs only. An opaque parent becomes part of the liquid.

`feColorMatrix` uses `type="matrix"`. The last two numbers are the alpha multiplier and the alpha offset in 0–1 space. The isosurface sits near `-offset / multiplier`. Stay at `14 -5` for cream (zen default) or `20 -8` for a taut meniscus. A multiplier near 255 removes the antialiased edge. Do not animate `stdDeviation`; it refilters the whole layer. Animate the blobs' transforms.

```html
<svg width="0" height="0" aria-hidden="true">
  <filter id="goo" x="-50%" y="-50%" width="200%" height="200%"
          color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
    <feColorMatrix in="blur" type="matrix" result="goo"
      values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -5" />
  </filter>
</svg>
```

```css
.pool-goo {
  position: absolute;
  inset: 0;
  background: transparent;
  filter: url(#goo) drop-shadow(12px 16px 18px color-mix(in srgb, var(--shade) 55%, transparent));
}
.blob {
  position: absolute;
  border-radius: 50%;
  background: var(--clay);
  will-change: transform;
}
```

`stdDeviation` around `0.22 × blob radius` is a starting point (10–16px for 48–72px blobs). Give each pool its own filter id (`useId` in React) so two matrices never collide.

Highlight, optional and easy to overdo: a second circle per blob at 45% of the radius, offset by `(-0.2r, -0.2r)`, fill `--highlight` at 0.45 opacity, inside the same filter so it merges. If the pool starts to look glossy, remove it and keep the canvas shader instead.

Text, icons, and hit targets are siblings of `.pool-goo`, not children. The filter blurs whatever it contains.

Safari mis-filters an HTML element that is itself transformed. Transform the blobs. Leave the filtered wrapper untransformed.

## Clip and material

Clip the pool to the focal circle (`border-radius: 50%; overflow: hidden` on a wrapper outside the filter, so the shadow is not clipped — put the drop-shadow on the clipped content's parent only if the shadow should stay inside; for a stone sitting in a well, clip, and let the well's inset shadow do the depth).

`--clay` stays close to `--paper`, a warm step, not a saturated accent. Moss is for the action mark on controls, not for the liquid.
