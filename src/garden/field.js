const MAX = 24;

const VERT = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_dpr;
uniform int u_count;
uniform vec4 u_bounds[24];
uniform float u_radius;
uniform vec3 u_shade;
uniform vec3 u_highlight;
out vec4 outColor;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdRoundBox(vec2 p, vec2 center, vec2 size, float radius) {
  vec2 q = abs(p - center) - size * 0.5 + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

float field(vec2 p) {
  float d = 10000.0;
  for (int i = 0; i < 24; i++) {
    if (i >= u_count) break;
    vec2 center = u_bounds[i].xy;
    vec2 size = u_bounds[i].zw;
    float radius = min(u_radius, min(size.x, size.y) * 0.5);
    d = smin(d, sdRoundBox(p, center, size, radius), 20.0);
  }
  return d;
}

float heightAt(vec2 p) {
  float d = field(p);
  if (d <= 0.0) return 0.0;
  float wave = smoothstep(-0.6, 0.6, sin(d * 6.28318 / 36.0 - 1.5707));
  float mask = smoothstep(0.0, 12.0, d);
  return wave * mask * -1.0;
}

void main() {
  vec2 p = gl_FragCoord.xy / u_dpr;
  p.y = (u_resolution.y / u_dpr) - p.y;
  float d = field(p);
  vec2 eps = vec2(1.0, 0.0);
  float h = heightAt(p);
  vec3 normal = normalize(vec3(h - heightAt(p + eps.xy), h - heightAt(p + eps.yx), 1.0));
  vec3 lightDir = normalize(vec3(-1.0, -1.0, 1.2));
  float diffuse = max(dot(normal, lightDir), 0.0);
  vec3 color = mix(u_shade, u_highlight, diffuse);
  float crevice = smoothstep(0.0, 6.0, d);
  color = mix(color * 0.75, color, crevice);
  outColor = vec4(color, 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createField(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uniforms = {
    resolution: gl.getUniformLocation(program, "u_resolution"),
    dpr: gl.getUniformLocation(program, "u_dpr"),
    count: gl.getUniformLocation(program, "u_count"),
    bounds: gl.getUniformLocation(program, "u_bounds"),
    radius: gl.getUniformLocation(program, "u_radius"),
    shade: gl.getUniformLocation(program, "u_shade"),
    highlight: gl.getUniformLocation(program, "u_highlight"),
  };
  let bufferSize = { w: 0, h: 0 };

  function draw(root, theme) {
    if (!root) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(root.clientWidth * dpr));
    const h = Math.max(1, Math.floor(root.clientHeight * dpr));
    if (bufferSize.w !== w || bufferSize.h !== h) {
      canvas.width = w;
      canvas.height = h;
      bufferSize = { w, h };
      gl.viewport(0, 0, w, h);
    }
    const origin = root.getBoundingClientRect();
    const bounds = new Float32Array(MAX * 4);
    const nodes = [...root.querySelectorAll("[data-ripple]")].slice(0, MAX);
    nodes.forEach((node, index) => {
      const rect = node.getBoundingClientRect();
      bounds[index * 4] = rect.left - origin.left + rect.width / 2;
      bounds[index * 4 + 1] = rect.top - origin.top + rect.height / 2;
      bounds[index * 4 + 2] = rect.width;
      bounds[index * 4 + 3] = rect.height;
    });
    const dark = theme === "dark";
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, w, h);
    gl.uniform1f(uniforms.dpr, dpr);
    gl.uniform1i(uniforms.count, nodes.length);
    gl.uniform4fv(uniforms.bounds, bounds);
    gl.uniform1f(uniforms.radius, 28);
    gl.uniform3f(uniforms.shade, ...(dark ? [0.07, 0.08, 0.1] : [0.7, 0.68, 0.65]));
    gl.uniform3f(uniforms.highlight, ...(dark ? [0.2, 0.22, 0.27] : [1, 1, 0.98]));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return { draw };
}
