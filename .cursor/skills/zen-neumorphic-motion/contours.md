# Rake lines

The rake is one height field. Each stone adds a warp that follows its silhouette. Isolines of that field are the grooves. Because the warp is combined before the lines are drawn, two neighboring families become one wave instead of two curves crossing.

## Stones first

A stone is one closed shape. Build it from two to four lobes of a single mass, joined with a small smooth minimum so the outline is a pebble, not a cluster of circles. Lobes belong to that stone. They are not other stones.

```js
function smin(a, b, k) {
  if (!Number.isFinite(a)) return b;
  if (!Number.isFinite(b)) return a;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * h * k * (1 / 6);
}

function sdfStone(stone, x, y) {
  let d = Infinity;
  for (const lobe of stone.lobes) {
    const di = Math.hypot(x - lobe.x, y - lobe.y) - lobe.r;
    d = smin(d, di, 18);
  }
  return d;
}
```

`sdf < 0` is inside. The gap between two stones is the minimum of `distance(lobeA, lobeB) - rA - rB` over their lobes, minus a few pixels for the smooth join. Keep that gap at least `--gap` (72px). If a drag would close it, stop the dragged stone. Do not let outlines touch.

A grove uses the same sdf. It is only a lighter fill and less type.

## The field

```js
function falloff(d, reach) {
  if (d <= 0) return 1;
  const t = Math.min(1, d / reach);
  const s = 1 - t;
  return s * s * (3 - 2 * s);
}

function height(x, y, stones, reach) {
  let d = Infinity;
  for (const stone of stones) d = smin(d, sdfStone(stone, x, y), 48);
  const outside = Math.max(0, d);
  const along = y + x * 0.08;
  const w = falloff(outside, reach);
  return (1 - w) * along + w * (outside * 1.15 + along * 0.2);
}
```

Blend the two fields. Do not add a tall warp on top of `along`. A warp of size `reach` has a slope near 1, and added to the rake it folds isolines into closed rings around the stone.

- `along` is the rake's long direction. Where `w` is 0, isolines are quiet, slightly tilted waves.
- Beside an outline `w` is 1, so the field is mostly the distance to that silhouette. The first grooves run parallel to the stone. By `reach` (about 150px) `w` is 0 and the echo has become the long rake.
- The `along * 0.2` term inside the near field keeps a little of the rake's direction, so the echo is a projection of the silhouette rather than a perfect offset ring. It also keeps the gradient near 1, so groove spacing stays even through the blend.
- `smin` between stones, with `k` around 48, is the merge. In the channel both distances are close, the smooth minimum bends `outside`, and the isolines bow into one curve. Next to a single outline the other stone is far, `smin` returns that outline's distance, and the groove stays faithful to its shape.
- `k` near 0 leaves a hard crease on the seam between stones. `k` larger than the gap melts every stone into one oval warp. Stay near one contour of the gap, about 40–64px.

Do not add a closed ring set, a spiral, or a second family of lines on top of this field.

## Isolines

March the field on a grid of about 3px. For each cell, emit a segment wherever a level in `(min(corners), max(corners)]` crosses an edge. Levels step by `--rake` (8–12px), the gap between grooves.

Interpolate the crossing. A hard midpoint on the edge facets the wave.

```js
function cross(v0, v1, level, p0, p1) {
  const t = (level - v0) / (v1 - v0 || 1e-6);
  return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}
```

Skip a cell when every corner is inside any stone (`sdf < 2`). Grooves stop at the silhouette. Draw the rake, then the stones, so a stone occludes the sand under it.

Join collinear segments into polylines before stroking. A pile of unjoined dashes reads as noise. Use round caps and round joins. Key a shared vertex by its rounded coordinate. Decimal strings for every vertex dominate the frame.

Saddle cells (two opposite corners inside the level) must pick one pairing from the corner average. Flip the pairing and the wave pinches the wrong way.

## Groove stroke

One light, top-left. A groove is three hairlines, not a drop shadow on the whole canvas.

```js
function groove(ctx, path) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 1.15;
  ctx.strokeStyle = "rgba(120, 104, 86, 0.28)";
  ctx.save();
  ctx.translate(0.8, 0.9);
  ctx.stroke(path);
  ctx.restore();
  ctx.strokeStyle = "rgba(255, 250, 244, 0.9)";
  ctx.save();
  ctx.translate(-0.7, -0.7);
  ctx.stroke(path);
  ctx.restore();
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = "rgba(92, 78, 64, 0.22)";
  ctx.stroke(path);
}
```

Keep the shade faint. If the grooves buzz, lower the shade alpha before you thin them out. Spacing stays in the 8–12px band so the sand still reads as raked, not ruled.

## Drift

Add a slow wave after the warp, amplitude at most 2.5px:

```js
h += Math.sin(x * 0.012 + y * 0.01 - time * 0.45) * 2.2;
```

The phase travels along the rake. It does not move the stones. Under `prefers-reduced-motion: reduce`, drop this term. A drag still recomputes `height` from the new stone positions.

Hover subtracts about 5px from that stone's distance before the smooth minimum, so its echo eases outward. Press adds about 3px, so the echo pulls in. The other stones' grooves stay still. Recompute the field. Do not slide a cached copy of the lines.

## Drawing order and cost

1. Fill the canvas with `--paper`.
2. Stroke every groove polyline.
3. Fill each stone from its own sdf at 0, with a top-left highlight gradient and one shadow offset down-right. Blur about 16px, alpha about 0.3. Do not blur the grooves.
4. Set HTML labels in DOM nodes centered on each stone. The canvas does not own the text.

Recompute the grid while a stone moves, and once after the drift clock if it is running. Cache the polyline set when every stone is resting and drift is off. March a still study at about 3px. A full-viewport garden that is being dragged can step to 4px, and to 5px if a frame still runs past about 50ms. Dropping grooves is the last resort.

A stone's hit test is `sdfStone(stone, x, y) < 0`, not its bounding box.

## Liquid fusion

Smooth-min inside one stone is how a pebble gets a single outline. Smooth-min between stones is how grooves merge. Neither one is a license to fuse the filled bodies.

A goo filter (`feGaussianBlur` plus an alpha `feColorMatrix`) welds filled shapes into one liquid body. That is a different effect. Use it only when the interface is explicitly liquid. Do not use it for stones, groves, or the rake. The garden's merge is a change of the groove's path, with daylight still between the masses.
