import { Howl, Howler } from "howler";

const LEVELS = [
  { id: "quiet", label: "Quiet", value: 0 },
  { id: "soft", label: "Soft", value: 0.28 },
  { id: "room", label: "Room", value: 0.55 },
  { id: "near", label: "Near", value: 0.85 },
];

const STORAGE_KEY = "pallas-athena-volume";

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

function render(seconds, sampleRate, voice) {
  const count = Math.floor(sampleRate * seconds);
  const samples = new Float32Array(count);
  let noise = 0;
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate;
    noise = noise * 0.96 + (Math.random() * 2 - 1) * 0.04;
    samples[i] = voice(t, noise);
  }
  return encodeWav(samples, sampleRate);
}

let cues = null;
let air = null;
let lastHover = 0;
let unlocked = false;
let levelValue = 0.55;

function build() {
  if (cues) return;
  const rate = 22050;
  cues = {
    tick: new Howl({ src: [render(0.06, rate, (t) => Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 46) * 0.18)] }),
    press: new Howl({ src: [render(0.09, rate, (t, noise) => (Math.sin(2 * Math.PI * 165 * t) * 0.55 + noise) * Math.exp(-t * 28) * 0.35)] }),
    release: new Howl({ src: [render(0.08, rate, (t) => Math.sin(2 * Math.PI * 330 * t) * Math.exp(-t * 32) * 0.16)] }),
    chime: new Howl({
      src: [render(0.42, rate, (t) => (
        Math.sin(2 * Math.PI * 523 * t) * 0.4 + Math.sin(2 * Math.PI * 784 * t) * (t > 0.08 ? 0.28 : 0)
      ) * Math.exp(-t * 6) * 0.3)],
    }),
    sweep: new Howl({
      src: [render(0.36, rate, (t, noise) => {
        const freq = 220 + t * 640;
        return (Math.sin(2 * Math.PI * freq * t) * 0.35 + noise * 0.4) * Math.sin(Math.min(1, t / 0.05) * Math.PI) * Math.exp(-t * 4) * 0.4;
      })],
    }),
    tock: new Howl({ src: [render(0.12, rate, (t, noise) => (Math.sin(2 * Math.PI * 196 * t) + noise * 1.4) * Math.exp(-t * 22) * 0.4)] }),
    low: new Howl({ src: [render(0.14, rate, (t) => Math.sin(2 * Math.PI * 140 * t) * Math.exp(-t * 16) * 0.28)] }),
  };
  air = new Howl({
    src: [render(0.8, rate, (t, noise) => noise * (0.55 + 0.45 * Math.sin(2 * Math.PI * 3 * t)) * 0.22)],
    loop: true,
    volume: 0.35,
  });
}

export function volumeLevels() {
  return LEVELS;
}

export function readVolume() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const match = LEVELS.find((level) => level.id === stored);
    if (match) return match.id;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "quiet";
  return "room";
}

export function applyVolume(id) {
  const level = LEVELS.find((item) => item.id === id) || LEVELS[2];
  levelValue = level.value;
  localStorage.setItem(STORAGE_KEY, level.id);
  Howler.volume(level.value);
  Howler.mute(level.value === 0);
  return level.id;
}

export function unlock() {
  if (unlocked) return;
  unlocked = true;
  build();
  const ctx = Howler.ctx;
  if (ctx && ctx.state === "suspended") ctx.resume();
}

function play(name) {
  if (!unlocked || levelValue === 0 || !cues) return;
  cues[name].play();
}

export const sound = {
  hover() {
    const now = performance.now();
    if (now - lastHover < 160) return;
    lastHover = now;
    play("tick");
  },
  press() { play("press"); },
  release() { play("release"); },
  chime() { play("chime"); },
  sweep() { play("sweep"); },
  tock() { play("tock"); },
  low() { play("low"); },
  airStart() {
    if (!unlocked || levelValue === 0 || !air || air.playing()) return;
    air.play();
  },
  airStop() {
    if (air) air.stop();
  },
};
