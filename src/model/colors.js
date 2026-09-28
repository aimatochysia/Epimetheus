/** Muted earth tags. Ink is the label color on a tag. */
export const TAG_INK = "#f4f1ea";

export const COLORS = [
  { id: "moss", label: "Moss", hex: "#64725d" },
  { id: "sage", label: "Sage", hex: "#5f684f" },
  { id: "pine", label: "Pine", hex: "#3e5246" },
  { id: "bamboo", label: "Bamboo", hex: "#4f6248" },
  { id: "clay", label: "Clay", hex: "#6e5044" },
  { id: "sand", label: "Sand", hex: "#6b5b45" },
  { id: "ink", label: "Ink", hex: "#3c4a5e" },
  { id: "dusk", label: "Dusk", hex: "#53445c" },
  { id: "sakura", label: "Sakura", hex: "#6d4552" },
  { id: "gold", label: "Gold", hex: "#6a5834" },
  { id: "river", label: "River", hex: "#3e5560" },
  { id: "bark", label: "Bark", hex: "#5a463c" },
];

const IDS = new Set(COLORS.map((color) => color.id));

export function colorById(id) {
  return COLORS.find((color) => color.id === id) || COLORS[0];
}

export function isColorId(id) {
  return IDS.has(id);
}
