# Sound

Cues are synthesized when the gesture happens. No samples, no network fetch. Every cue has a visual twin from [motion.md](motion.md). Sound never carries a state by itself.

## Policy

- One `AudioContext` per page. Browsers cap contexts, and separate clocks drift.
- Create it on the first `pointerdown` or `keydown`, or call `resume()` there if it was created earlier. A context born before a gesture stays `suspended` and fails in silence.
- Master gain, then a compressor, then the destination. Cue gains below are pre-master.
- Default master gain `0.45`. `prefers-reduced-motion: reduce` starts muted. A switch can turn sound on anyway.
- Persist the switch in `localStorage` under `zen-sound` (`on` or `off`). The stored choice wins over the reduced-motion default after the person has toggled it.
- The switch is `role="switch"` with `aria-checked`, and a visible mark that is not color alone (a break in a ring, or "sound" / "quiet").
- Hover cues fire only for `pointerType !== "touch"`, and only on controls, with a 160ms cooldown. Drag does not use the hover tick.
- Exponential ramps never start at 0. Start at `0.0001`. A bare `gain.value =` during playback clicks.
- Stop oscillators. A cue that can overlap (the bowl) is fine. The air voice is single-instance.

Pitch family, so leftovers do not clash: press near E3 (165Hz), reject near G3 (196Hz), hover near D5–A5, bowl rooted at G3.

## Bus and cues

```js
export function createSound(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.45;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.12;
  master.connect(comp);
  comp.connect(ctx.destination);

  const last = new Map();
  const allow = (name, gap) => {
    const now = ctx.currentTime;
    if (now - (last.get(name) || 0) < gap) return false;
    last.set(name, now);
    return true;
  };

  function tone({ freq, gain, dur, type = "sine", attack = 0.006 }) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function noiseBurst({ dur, gain, band, q }) {
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = band;
    filter.Q.value = q;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  let air = null;

  function bowl(root, dur) {
    // Partials near measured singing-bowl ratios 1, ~2.98, ~5.70.
    // The second oscillator of each pair is a few hertz sharp, which is the shimmer.
    for (const [ratio, gain, decay] of [
      [1, 0.08, dur],
      [2.98, 0.032, dur * 0.85],
      [5.7, 0.016, dur * 0.65],
    ]) {
      tone({ freq: root * ratio, gain, dur: decay });
      tone({ freq: root * ratio + 2.4, gain: gain * 0.55, dur: decay });
    }
  }

  return {
    setMuted(muted) {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setTargetAtTime(muted ? 0.0001 : 0.45, t, 0.03);
    },
    hover() {
      if (!allow("hover", 0.16)) return;
      tone({ freq: 587, gain: 0.028, dur: 0.05 });
      tone({ freq: 880, gain: 0.01, dur: 0.04 });
    },
    press() {
      if (!allow("press", 0.05)) return;
      tone({ freq: 165, gain: 0.07, dur: 0.08, type: "triangle" });
      noiseBurst({ dur: 0.045, gain: 0.045, band: 900, q: 3 });
    },
    release() {
      if (!allow("release", 0.05)) return;
      tone({ freq: 330, gain: 0.035, dur: 0.06 });
    },
    airStart() {
      if (air) return;
      const seconds = 1;
      const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        brown = (brown + 0.02 * white) / 1.02;
        data[i] = brown * 3.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 640;
      filter.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      src.connect(filter);
      filter.connect(g);
      g.connect(master);
      src.start();
      air = { src, g, filter };
    },
    airSpeed(pxPerSec) {
      if (!air) return;
      const t = ctx.currentTime;
      const target = Math.min(0.045, Math.max(0.0001, pxPerSec / 9000));
      air.g.gain.setTargetAtTime(target, t, 0.05);
      air.filter.frequency.setTargetAtTime(480 + Math.min(pxPerSec, 1400) * 0.35, t, 0.08);
    },
    airStop() {
      if (!air) return;
      const dying = air;
      air = null;
      const t = ctx.currentTime;
      dying.g.gain.setTargetAtTime(0.0001, t, 0.04);
      dying.src.stop(t + 0.2);
    },
    drop() {
      this.airStop();
      bowl(196, 1.4);
    },
    reject() {
      this.airStop();
      tone({ freq: 196, gain: 0.04, dur: 0.18 });
      tone({ freq: 185, gain: 0.028, dur: 0.2 });
    },
  };
}
```

## Wiring

| Call | When |
| --- | --- |
| `hover` | `pointerenter` on a control, mouse or pen only |
| `press` | `pointerdown` on a control, and at drag start |
| `release` | `pointerup` after a press that was not a drag |
| `airStart` | Drag threshold crossed (about 4px), once |
| `airSpeed` | `pointermove` while dragging, with px/s since the previous event |
| `airStop` | Included in `drop` and `reject` |
| `drop` | Once, when the outline gap to a neighbor first falls below one ripple period (36px) and the sand bridge is still open |
| `reject` | Escape, or a release that was pushed back to keep the sand bridge |

Do not allocate noise buffers inside `pointermove`. `airSpeed` only retargets an existing gain.

## Mute and reduced motion

```js
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const stored = localStorage.getItem("zen-sound");
let muted = stored ? stored === "off" : reduce;
```

Call `setMuted(muted)` after the context exists. Write storage only in the switch handler, so a person who never touches it still follows the system motion setting.

Declare the player as `let sound = null` before any function that reads it. A later `let sound` is in the temporal dead zone, so `if (sound)` throws and the rest of the script never binds the gestures.

## Leave out

- A cue on scroll, on type, or on every focus change during keyboard navigation.
- Hover audio on a list of dozens of rows. The cooldown is a backstop, not a license.
- Samples of real singing bowls. The partial recipe is the instrument, and it keeps the page free of assets.
- Harsh noise, distortion, or a low buzz for errors. Reject is two close sines, quieter than the bowl.
