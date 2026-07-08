// LLM-authored SVG art. Each entry is a shape drawn in a 0..100 viewBox,
// a happy color, and a note pitch. Ask Claude for more and paste them in.
export interface ShapeDef {
  name: string;
  color: string;
  freq: number;
  path: string; // inner SVG markup, sized to a 100x100 viewBox
}

export const SHAPES: ShapeDef[] = [
  {
    name: "circle",
    color: "#ff5d73",
    freq: 392,
    path: `<circle cx="50" cy="50" r="42" />`,
  },
  {
    name: "square",
    color: "#4cc9f0",
    freq: 440,
    path: `<rect x="12" y="12" width="76" height="76" rx="16" />`,
  },
  {
    name: "triangle",
    color: "#ffd166",
    freq: 494,
    path: `<path d="M50 8 L92 88 L8 88 Z" stroke-linejoin="round" stroke-width="14" stroke="#ffd166" />`,
  },
  {
    name: "star",
    color: "#b5e48c",
    freq: 523,
    path: `<path d="M50 6 L61 38 L95 38 L67 58 L78 92 L50 71 L22 92 L33 58 L5 38 L39 38 Z" stroke-linejoin="round" stroke-width="8" stroke="#b5e48c" />`,
  },
  {
    name: "heart",
    color: "#f15bb5",
    freq: 587,
    path: `<path d="M50 86 C10 56 12 24 34 24 C44 24 50 32 50 32 C50 32 56 24 66 24 C88 24 90 56 50 86 Z" />`,
  },
];

export function shapeSvg(s: ShapeDef): string {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="${s.color}">${s.path}</svg>`;
}
