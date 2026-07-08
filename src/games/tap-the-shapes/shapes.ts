// LLM-authored SVG art. Each entry is a heart drawn in a 0..100 viewBox,
// a happy color, and a note pitch. Ask Claude for more and paste them in.
export interface ShapeDef {
  name: string;
  color: string;
  freq: number;
  path: string; // inner SVG markup, sized to a 100x100 viewBox
}

const HEART = `<path d="M50 86 C10 56 12 24 34 24 C44 24 50 32 50 32 C50 32 56 24 66 24 C88 24 90 56 50 86 Z" />`;

export const SHAPES: ShapeDef[] = [
  { name: "red", color: "#ff5d73", freq: 392, path: HEART },
  { name: "orange", color: "#ff9f4a", freq: 440, path: HEART },
  { name: "yellow", color: "#ffd166", freq: 494, path: HEART },
  { name: "green", color: "#8ac926", freq: 523, path: HEART },
  { name: "blue", color: "#4cc9f0", freq: 587, path: HEART },
  { name: "purple", color: "#9b5de5", freq: 659, path: HEART },
  { name: "pink", color: "#f15bb5", freq: 698, path: HEART },
];

export function shapeSvg(s: ShapeDef): string {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="${s.color}">${s.path}</svg>`;
}
