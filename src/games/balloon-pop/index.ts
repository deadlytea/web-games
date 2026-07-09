import type { Game, GameInstance } from "../../types";
import { pop } from "../../sound";

const TARGET_ON_SCREEN = 11;
const SIZE_VMIN = 20;
const RISE_SPEED = [3.5, 5.5]; // vmin per second
const SWAY_SPEED = [0.48, 1.12]; // Hz
const SWAY_AMOUNT = [3, 7]; // vmin

const BALLOONS = [
  { color: "#ff5d73", freq: 392 },
  { color: "#ff9f4a", freq: 440 },
  { color: "#ffd166", freq: 494 },
  { color: "#8ac926", freq: 523 },
  { color: "#4cc9f0", freq: 587 },
  { color: "#9b5de5", freq: 659 },
  { color: "#f15bb5", freq: 698 },
];
const CONFETTI_COLORS = BALLOONS.map((b) => b.color);

const STYLE_ID = "bp-style";
const CSS = `
.bp-score { position: fixed; top: max(12px, env(safe-area-inset-top)); right: max(12px, env(safe-area-inset-right)); z-index: 10;
  display: flex; align-items: center; gap: .4em; padding: .3em .7em .3em .6em; border-radius: 999px;
  background: rgba(255,255,255,.88); box-shadow: 0 4px 0 rgba(0,0,0,.2);
  font-family: "Baloo 2", "Fredoka One", "Comic Sans MS", "Arial Rounded MT Bold", ui-rounded, sans-serif;
  font-size: clamp(22px, 6vw, 34px); font-weight: 800; line-height: 1; color: #ff4593;
  -webkit-text-stroke: 1.4px #fff; text-stroke: 1.4px #fff;
  text-shadow: 0 2px 0 rgba(255,255,255,.9), 0 3px 3px rgba(0,0,0,.18);
  user-select: none; }
.bp-score__emoji { font-size: 1.15em; -webkit-text-stroke: 0; text-stroke: 0; text-shadow: none; }
.bp-score__num { min-width: 1ch; }
.bp-score__num.bp-bump { animation: bp-bump .32s ease; }
@keyframes bp-bump { 0% { transform: scale(1); } 45% { transform: scale(1.4) rotate(-4deg); } 100% { transform: scale(1); } }
`;

let uid = 0;

function balloonSvg(color: string): string {
  const id = `bp${uid++}`;
  const top = lighten(color, 0.45);
  const bottom = darken(color, 0.18);
  return `<svg viewBox="0 0 100 180" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${id}g" cx="36%" cy="28%" r="80%">
        <stop offset="0%" stop-color="${top}"/>
        <stop offset="55%" stop-color="${color}"/>
        <stop offset="100%" stop-color="${bottom}"/>
      </radialGradient>
      <radialGradient id="${id}s" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity=".95"/>
        <stop offset="65%" stop-color="#ffffff" stop-opacity=".22"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="50" cy="52" rx="42" ry="50" fill="url(#${id}g)"/>
    <ellipse cx="34" cy="28" rx="16" ry="22" fill="url(#${id}s)" transform="rotate(-16 34 28)"/>
    <path d="M46 100 Q50 106 54 100" fill="#8a8a8a"/>
    <path d="M50 103 C 62 118, 38 133, 50 148 C 62 163, 38 172, 46 180" stroke="#8a8a8a" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function lighten(hex: string, amt: number): string {
  return mix(hex, "#ffffff", amt);
}

function darken(hex: string, amt: number): string {
  return mix(hex, "#000000", amt);
}

function mix(hex: string, withHex: string, amt: number): string {
  const a = parseHex(hex);
  const b = parseHex(withHex);
  const r = Math.round(a.r + (b.r - a.r) * amt);
  const g = Math.round(a.g + (b.g - a.g) * amt);
  const bch = Math.round(a.b + (b.b - a.b) * amt);
  return `rgb(${r}, ${g}, ${bch})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const n = hex.replace("#", "");
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

interface Balloon {
  el: HTMLElement;
  baseX: number;
  y: number;
  swaySpeed: number;
  swayAmount: number;
  swayPhase: number;
  riseSpeed: number;
}

function mount(root: HTMLElement): GameInstance {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  root.style.position = "absolute";
  root.style.inset = "0";
  root.style.overflow = "hidden";
  root.style.background = "linear-gradient(180deg, #cdeffd 0%, #eaf9ff 100%)";

  let alive = true;
  let score = 0;
  const balloons = new Set<Balloon>();
  let lastT = performance.now();

  const scoreEl = document.createElement("div");
  scoreEl.className = "bp-score";
  const scoreNum = document.createElement("span");
  scoreNum.className = "bp-score__num";
  scoreNum.textContent = "0";
  scoreEl.innerHTML = `<span class="bp-score__emoji">🎈</span>`;
  scoreEl.appendChild(scoreNum);
  root.appendChild(scoreEl);

  function addScore() {
    score++;
    scoreNum.textContent = String(score);
    scoreNum.classList.remove("bp-bump");
    void scoreNum.offsetWidth;
    scoreNum.classList.add("bp-bump");
  }

  function spawn() {
    if (!alive) return;
    const def = BALLOONS[Math.floor(Math.random() * BALLOONS.length)];
    const el = document.createElement("div");
    el.innerHTML = balloonSvg(def.color);
    el.style.position = "absolute";
    el.style.width = `${SIZE_VMIN}vmin`;
    el.style.height = `${SIZE_VMIN * 1.8}vmin`;
    el.style.cursor = "pointer";
    el.style.filter = "drop-shadow(0 8px 8px rgba(0,0,0,.2))";
    el.style.touchAction = "none";
    const svg = el.firstElementChild as SVGElement | null;
    if (svg) {
      svg.style.width = "100%";
      svg.style.height = "100%";
    }

    const pad = SIZE_VMIN;
    const baseX = rand(pad, 100 - pad * 2);
    const b: Balloon = {
      el,
      baseX,
      y: 100 + rand(0, 20),
      swaySpeed: rand(SWAY_SPEED[0], SWAY_SPEED[1]),
      swayAmount: rand(SWAY_AMOUNT[0], SWAY_AMOUNT[1]),
      swayPhase: rand(0, Math.PI * 2),
      riseSpeed: rand(RISE_SPEED[0], RISE_SPEED[1]),
    };
    el.style.left = `${baseX}vmin`;
    el.style.top = `${b.y}vmin`;

    root.appendChild(el);
    balloons.add(b);

    el.animate(
      [
        { transform: "scale(0)", opacity: 0 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 260, easing: "cubic-bezier(.34,1.56,.64,1)" }
    );

    const onTap = (e: Event) => {
      e.preventDefault();
      if (!balloons.has(b)) return;
      balloons.delete(b);
      pop(def.freq);
      addScore();
      burstConfetti(el);
      const anim = el.animate(
        [
          { transform: "scale(1)", opacity: 1 },
          { transform: "scale(1.6)", opacity: 0 },
        ],
        { duration: 200, easing: "ease-out" }
      );
      anim.onfinish = () => {
        el.remove();
        spawn();
      };
    };
    el.addEventListener("pointerdown", onTap);
  }

  function burstConfetti(from: HTMLElement) {
    const b = from.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    const cx = b.left - r.left + b.width / 2;
    const cy = b.top - r.top + b.height / 2;

    for (let i = 0; i < 20; i++) {
      const p = document.createElement("div");
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const size = rand(6, 8);
      p.style.position = "absolute";
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.background = color;
      p.style.borderRadius = Math.random() < 0.5 ? "50%" : "2px";
      p.style.pointerEvents = "none";
      root.appendChild(p);

      const angle = rand(0, Math.PI * 2);
      const dist = rand(60, 160);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const anim = p.animate(
        [
          { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 90}px)) rotate(${rand(-360, 360)}deg)`, opacity: 0 },
        ],
        { duration: rand(650, 950), easing: "cubic-bezier(.2,.6,.3,1)" }
      );
      anim.onfinish = () => p.remove();
    }
  }

  function tick(t: number) {
    if (!alive) return;
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    for (const b of balloons) {
      b.y -= b.riseSpeed * dt;
      b.swayPhase += b.swaySpeed * dt * Math.PI * 2;
      const sway = Math.sin(b.swayPhase) * b.swayAmount;
      b.el.style.left = `${b.baseX + sway}vmin`;
      b.el.style.top = `${b.y}vmin`;

      if (b.y < -SIZE_VMIN * 1.8 - 5) {
        balloons.delete(b);
        b.el.remove();
        spawn();
      }
    }

    requestAnimationFrame(tick);
  }

  for (let i = 0; i < TARGET_ON_SCREEN; i++) spawn();
  requestAnimationFrame(tick);

  return {
    unmount() {
      alive = false;
      balloons.clear();
      document.getElementById(STYLE_ID)?.remove();
      root.replaceChildren();
      root.removeAttribute("style");
    },
  };
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const game: Game = {
  id: "balloon-pop",
  title: "Balloons",
  tile: "🎈",
  color: "#4cc9f0",
  mount,
};

export default game;
