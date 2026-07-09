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

function balloonSvg(color: string): string {
  return `<svg viewBox="0 0 100 180" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="52" rx="42" ry="50" fill="${color}"/>
    <ellipse cx="36" cy="34" rx="12" ry="18" fill="#ffffff" opacity="0.35"/>
    <path d="M46 100 Q50 106 54 100" fill="#8a8a8a"/>
    <path d="M50 103 C 62 118, 38 133, 50 148 C 62 163, 38 172, 46 180" stroke="#8a8a8a" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`;
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
  root.style.position = "absolute";
  root.style.inset = "0";
  root.style.overflow = "hidden";
  root.style.background = "linear-gradient(180deg, #cdeffd 0%, #eaf9ff 100%)";

  let alive = true;
  const balloons = new Set<Balloon>();
  let lastT = performance.now();

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
