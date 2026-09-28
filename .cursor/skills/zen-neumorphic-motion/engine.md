# Render engine

HTML cannot merge these outlines or light a groove. One WebGL canvas draws the garden. The DOM only supplies rectangles, colors, and hit targets.

## Layers

```css
#glcanvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}
.ui-layer { position: relative; z-index: 1; }
.zen-block {
  position: relative;
  background: transparent;
  border: 0;
  box-shadow: none;
  color: var(--stone-ink);
}
.safe-zone {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 3rem 2.5rem;
}
```

The page background is the sand fallback (`#dcd9d1`) so the first frame, and a lost WebGL context, still read as sand. After the first draw, the shader's light and shade replace that flat color.

Each rock is a `.zen-block.kanban-node` with a `data-color`. The safe zone is the only place text and controls go. Sample its four corners with `sdOrganicRock`. Each corner stays inside the rock by at least 8px. If a corner falls outside, add padding. Do not shrink the padding below `3rem` / `2.5rem` to fit more type.

## Pass

A full-screen triangle pair. WebGL1 is enough. Resize the drawing buffer only when `innerWidth`, `innerHeight`, or `devicePixelRatio` changes:

```js
const dpr = window.devicePixelRatio || 1;
canvas.width = Math.floor(innerWidth * dpr);
canvas.height = Math.floor(innerHeight * dpr);
gl.viewport(0, 0, canvas.width, canvas.height);
```

Upload `u_resolution` as the buffer size and `u_dpr` as that ratio. On a drag, upload bounds and draw. Do not reallocate the buffer.

Fragment position is CSS pixels with a DOM origin (top-left, y down):

```glsl
vec2 p = gl_FragCoord.xy / u_dpr;
p.y = (u_resolution.y / u_dpr) - p.y;
```

Uniforms, one entry per block, capped at a compile-time count (the reference uses 10). Grow the array and the loop bound together. Both stay constant.

- `u_bounds[i]`: center x, center y, width, height, from `getBoundingClientRect`, in CSS pixels.
- `u_colors[i]`: `data-color` as linear RGB, 0–1.
- `u_numBlocks`.

Draw once after layout, on resize, and once a moving block has settled. An idle garden does not animate. Do not upload bounds on each drag frame.

## The rock

A rounded box, then a dent that depends on the block's center so two blocks never share a perimeter.

```glsl
float sdOrganicRock(vec2 p, vec2 center, vec2 size) {
  vec2 bp = p - center;
  vec2 b = size * 0.5;
  float radius = min(b.x, b.y) * 0.45;
  vec2 q = abs(bp) - b + vec2(radius);
  float dBox = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  float angle = atan(bp.y, bp.x);
  float distortion = sin(angle * 2.0 + center.x * 0.01) * (min(b.x, b.y) * 0.08)
                   + cos(angle * 3.0 + center.y * 0.01) * (min(b.x, b.y) * 0.04);
  return dBox - distortion;
}
```

`d < 0` is inside. The phase is the live center, so a drag reshapes the dents slightly as the block moves. Keep that. A frozen random seed would make two positions look copied.

Port this function to JavaScript with the same constants. Hit tests and the drag guard call the JS copy. If the two copies diverge, the pointer grabs sand and the shader paints a different rock.

## Smooth minimum

Polynomial smooth minimum. `k` is 20. That pull is what assimilates ripples, and it is small enough that a sand bridge remains between blocks that are merely near each other.

```glsl
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
```

When the two distances are equal, the result sits `k/4` (5px) under either distance. Raising `k` deepens that pull until the bridge goes negative and the fills become one blob. Leave `k` at 20.

```glsl
vec4 map(vec2 p) {
  float d = 10000.0;
  vec3 color = vec3(0.0);
  float closest = 10000.0;
  for (int i = 0; i < 10; i++) {
    if (i >= u_numBlocks) break;
    vec2 center = u_bounds[i].xy;
    vec2 size = u_bounds[i].zw;
    float dist = sdOrganicRock(p, center, size);
    if (dist < closest) {
      closest = dist;
      color = u_colors[i];
    }
    d = smin(d, dist, 20.0);
  }
  return vec4(d, color);
}
```

Color follows the nearest raw outline. The blended distance is what the height and the fill test use. Sand ignores `color`.

## Height

Inside the rock, a bevel rises from the seam to a flat top. Outside, a sine of the distance is the rake. The phase (`-π/2`) meets the perimeter. `smoothstep` flattens the ridges so the sand looks raked rather than corrugated. A short mask clears the groove off the seam so the crevice stays clean.

```glsl
float getHeight(vec2 p) {
  float d = map(p).x;
  if (d <= 0.0) {
    float bevel = clamp(abs(d) / 20.0, 0.0, 1.0);
    return mix(0.0, 3.0, sin(bevel * 1.5707));
  }
  float waveSpacing = 36.0;
  float freq = 6.28318 / waveSpacing;
  float wave = smoothstep(-0.6, 0.6, sin(d * freq - 1.5707));
  float mask = smoothstep(0.0, 12.0, d);
  return wave * mask * -1.0;
}
```

`waveSpacing` stays 36px. A shorter period moirés and buzzes. The groove is this height, not a line. Do not stroke an isoline over it.

Because the wave is a function of the blended distance, two families become one curve in the channel. They cannot cross.

## Light

Finite differences, one pixel in CSS space. The normal's z is 1. A smaller z exaggerates the grooves into noise.

```glsl
vec2 eps = vec2(1.0, 0.0);
float h = getHeight(p);
vec3 normal = normalize(vec3(h - getHeight(p + eps.xy), h - getHeight(p + eps.yx), 1.0));
vec3 lightDir = normalize(vec3(-1.0, -1.0, 1.2));
float diffuse = max(dot(normal, lightDir), 0.0);
```

`lightDir` points toward the top-left in DOM space. Do not add a second light, a specular lobe, or a painted highlight gradient.

Sand is only the mix of shade and highlight through `diffuse`:

```glsl
vec3 sandShade = vec3(0.70, 0.68, 0.65);
vec3 sandHighlight = vec3(1.0, 1.0, 0.98);
vec3 sand = mix(sandShade, sandHighlight, diffuse);
float crevice = smoothstep(0.0, 6.0, d);
sand = mix(sand * 0.75, sand, crevice);
```

The crevice is 6px of darkening on the sand side of the seam. Keep it between 6px and 10px. It replaces the drop shadow. There is no blurred disc under the rock.

The rock is the single `data-color`, lit as a matte bevel:

```glsl
vec3 rock = rockColor * (diffuse * 0.55 + 0.55);
float rim = pow(1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), 4.0);
rock += vec3(0.12) * rim;
float innerEdge = smoothstep(-15.0, 0.0, d);
rock *= mix(0.9, 1.0, innerEdge);
```

The rim is the bevel turning away from the camera, at a low gain. The last line darkens the inner 15px so the top reads as carved. Fill stays one color under that lighting.

## Drag guard

The channel sample is the midpoint of the segment between two centers. Let `mid` be `smin` of the two organic distances there, with `k = 20`.

The wave mask is closed at `d = 0` and open at `d = 12`. Push the dragged block along that segment until `mid >= 12`. The fills stay apart, and a groove remains in the bridge. Closer than that, the mask swallows the ripple and the stones read as touching.

## Inner controls

These are DOM, painted over the rock, inside the safe zone. They are not in the shader.

```css
.task {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  box-shadow:
    inset 3px 3px 6px rgba(0, 0, 0, 0.15),
    inset -2px -2px 4px rgba(255, 255, 255, 0.1);
}
```

A header divider, if one is needed, is at most `1px` at 20% white. Prefer the inset card. Shadows on controls and on rounded containers are strictly inset. Do not add an outer shadow, a drop shadow, or a raised neumorphic pair. A bar's bottom edge, when shaped, bows down so the center is lower than the corners. Inverted corners that curve back up into the bar are not used.

## Forced colors

```css
@media (forced-colors: active) {
  #glcanvas { display: none; }
  .zen-block {
    background: Canvas;
    color: CanvasText;
    border: 1px solid ButtonText;
  }
}
```
