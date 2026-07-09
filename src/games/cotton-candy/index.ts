import type { Game, GameInstance } from "../../types";
import { pop } from "../../sound";

const CANDY_COLORS = ["#ff8fc7", "#ff6b9d", "#c084fc", "#7dd3fc", "#fde047", "#86efac"];
const HEARTS = ["❤️", "🧡", "💛", "💚", "💙", "💜"];
const STICKERS = ["⭐", "🌈", "🍓", "🦄", "✨", "🌸"];
const BITES = 5;

const STYLE_ID = "cc-style";
const CSS = `
.cc-play { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.cc-candy { width: 44vmin; height: 55vmin; position: relative; cursor: pointer; transform-origin: 50% 55%; transition: transform .18s ease; filter: drop-shadow(0 8px 10px rgba(0,0,0,.18)); touch-action: none; }
.cc-svg { width: 100%; height: 100%; display: block; }
.cc-decor { position: absolute; font-size: 7vmin; transform: translate(-50%, -50%); pointer-events: none; filter: drop-shadow(0 2px 2px rgba(0,0,0,.25)); }
.cc-palette { display: flex; flex-direction: column; gap: 1.2vmin; padding: 2vmin 2vmin calc(2vmin + env(safe-area-inset-bottom)); background: rgba(255,255,255,.72); backdrop-filter: blur(6px); }
.cc-row { display: flex; gap: 1.4vmin; justify-content: center; flex-wrap: wrap; align-items: center; }
.cc-swatch { width: 9vmin; height: 9vmin; border-radius: 50%; border: .6vmin solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,.2); cursor: pointer; padding: 0; }
.cc-swatch.cc-active { outline: .7vmin solid #ff4d94; outline-offset: 2px; }
.cc-chip { width: 10vmin; height: 10vmin; border-radius: 24%; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 6vmin; box-shadow: 0 2px 5px rgba(0,0,0,.18); cursor: pointer; user-select: none; touch-action: none; }
.cc-chip.cc-active { outline: .7vmin solid #ff4d94; outline-offset: 2px; transform: translateY(-.6vmin); }
.cc-bucket { font-size: 7vmin; user-select: none; }
.cc-ghost { position: fixed; font-size: 9vmin; transform: translate(-50%, -50%); pointer-events: none; z-index: 10; filter: drop-shadow(0 3px 4px rgba(0,0,0,.3)); }
.cc-crumb { position: absolute; border-radius: 50%; pointer-events: none; }
`;

function candySvg(color: string): string {
  return `<svg class="cc-svg" viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">
    <path d="M84 150 L116 150 L100 244 Z" fill="#e0b088"/>
    <path d="M88 168 L112 168 M92 190 L108 190 M96 212 L104 212" stroke="#c8975f" stroke-width="4" fill="none" stroke-linecap="round"/>
    <g class="cc-fluff" fill="${color}">
      <circle cx="64" cy="104" r="40"/>
      <circle cx="136" cy="104" r="40"/>
      <circle cx="100" cy="72" r="48"/>
      <circle cx="80" cy="58" r="34"/>
      <circle cx="120" cy="58" r="34"/>
      <circle cx="100" cy="112" r="44"/>
      <circle cx="100" cy="96" r="52"/>
    </g>
    <g fill="#ffffff" opacity="0.35">
      <circle cx="80" cy="66" r="13"/>
      <circle cx="110" cy="56" r="8"/>
    </g>
  </svg>`;
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
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.touchAction = "none";
  root.style.background = "radial-gradient(circle at 50% 25%, #ffffff 0%, #ffeef6 55%, #ffdcec 100%)";

  let alive = true;
  let color = CANDY_COLORS[0];
  let bites = 0;
  let selected: string | null = null;
  let selectedChip: HTMLElement | null = null;
  let dragging = false;
  let dragCleanup: (() => void) | null = null;

  const play = document.createElement("div");
  play.className = "cc-play";

  const candy = document.createElement("div");
  candy.className = "cc-candy";
  candy.innerHTML = candySvg(color);

  const decor = document.createElement("div");
  decor.style.position = "absolute";
  decor.style.inset = "0";
  candy.appendChild(decor);

  play.appendChild(candy);

  const palette = document.createElement("div");
  palette.className = "cc-palette";

  const colorRow = document.createElement("div");
  colorRow.className = "cc-row";
  const swatches: HTMLButtonElement[] = [];
  for (const c of CANDY_COLORS) {
    const b = document.createElement("button");
    b.className = "cc-swatch";
    b.style.background = c;
    if (c === color) b.classList.add("cc-active");
    b.addEventListener("click", () => {
      color = c;
      recolor();
      for (const s of swatches) s.classList.toggle("cc-active", s === b);
      pop(440);
    });
    swatches.push(b);
    colorRow.appendChild(b);
  }

  const itemRow = document.createElement("div");
  itemRow.className = "cc-row";
  const bucket = document.createElement("span");
  bucket.className = "cc-bucket";
  bucket.textContent = "🪣";
  itemRow.appendChild(bucket);
  for (const emoji of [...HEARTS, ...STICKERS]) {
    const chip = document.createElement("div");
    chip.className = "cc-chip";
    chip.textContent = emoji;
    attachChip(chip, emoji);
    itemRow.appendChild(chip);
  }

  palette.append(colorRow, itemRow);
  root.append(play, palette);

  function recolor() {
    const fluff = candy.querySelector(".cc-fluff");
    if (fluff) fluff.setAttribute("fill", color);
  }

  function scaleFor(b: number): number {
    return 1 - b * 0.16;
  }

  function eat() {
    bites++;
    pop(180 + bites * 24);
    crumbs();
    if (bites >= BITES) {
      const anim = candy.animate(
        [
          { transform: `scale(${scaleFor(bites - 1)})`, opacity: 1 },
          { transform: "scale(.05)", opacity: 0 },
        ],
        { duration: 260, easing: "ease-in" }
      );
      anim.onfinish = () => {
        if (!alive) return;
        bites = 0;
        decor.replaceChildren();
        candy.style.transform = "scale(1)";
        candy.animate(
          [{ transform: "scale(0)" }, { transform: "scale(1.1)" }, { transform: "scale(1)" }],
          { duration: 420, easing: "cubic-bezier(.34,1.56,.64,1)" }
        );
      };
    } else {
      const s = scaleFor(bites);
      candy.style.transform = `scale(${s})`;
      candy.animate(
        [
          { transform: `scale(${s}) rotate(-3deg)` },
          { transform: `scale(${s}) rotate(3deg)` },
          { transform: `scale(${s}) rotate(0)` },
        ],
        { duration: 200, easing: "ease-out" }
      );
    }
  }

  function crumbs() {
    const rect = candy.getBoundingClientRect();
    const pr = play.getBoundingClientRect();
    const cx = rect.left - pr.left + rect.width / 2;
    const cy = rect.top - pr.top + rect.height * 0.4;
    for (let i = 0; i < 8; i++) {
      const d = document.createElement("div");
      d.className = "cc-crumb";
      const sz = rand(6, 12);
      d.style.width = `${sz}px`;
      d.style.height = `${sz}px`;
      d.style.background = color;
      d.style.left = `${cx}px`;
      d.style.top = `${cy}px`;
      play.appendChild(d);
      const ang = rand(0, Math.PI * 2);
      const dist = rand(30, 80);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist + 40;
      const a = d.animate(
        [
          { transform: "translate(-50%, -50%)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`, opacity: 0 },
        ],
        { duration: rand(500, 800), easing: "ease-out" }
      );
      a.onfinish = () => d.remove();
    }
  }

  function placeDecoration(emoji: string, clientX: number, clientY: number) {
    const rect = candy.getBoundingClientRect();
    const nx = clamp((clientX - rect.left) / rect.width, 0.15, 0.85);
    const ny = clamp((clientY - rect.top) / rect.height, 0.12, 0.58);
    const s = document.createElement("span");
    s.className = "cc-decor";
    s.textContent = emoji;
    s.style.left = `${nx * 100}%`;
    s.style.top = `${ny * 100}%`;
    decor.appendChild(s);
    s.animate(
      [
        { transform: "translate(-50%, -50%) scale(0)" },
        { transform: "translate(-50%, -50%) scale(1.15)" },
        { transform: "translate(-50%, -50%) scale(1)" },
      ],
      { duration: 300, easing: "cubic-bezier(.34,1.56,.64,1)" }
    );
    pop(680);
  }

  function selectChip(emoji: string, chip: HTMLElement) {
    if (selectedChip === chip) {
      selected = null;
      selectedChip = null;
      chip.classList.remove("cc-active");
      return;
    }
    if (selectedChip) selectedChip.classList.remove("cc-active");
    selected = emoji;
    selectedChip = chip;
    chip.classList.add("cc-active");
  }

  function attachChip(chip: HTMLElement, emoji: string) {
    chip.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const start = { x: e.clientX, y: e.clientY };
      let ghost: HTMLElement | null = null;

      const move = (ev: PointerEvent) => {
        const d = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
        if (!ghost && d > 10) {
          dragging = true;
          ghost = document.createElement("span");
          ghost.className = "cc-ghost";
          ghost.textContent = emoji;
          root.appendChild(ghost);
        }
        if (ghost) {
          ghost.style.left = `${ev.clientX}px`;
          ghost.style.top = `${ev.clientY}px`;
        }
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        dragCleanup = null;
        if (ghost) {
          ghost.remove();
          const rect = candy.getBoundingClientRect();
          if (inside(ev.clientX, ev.clientY, rect)) placeDecoration(emoji, ev.clientX, ev.clientY);
          dragging = false;
        } else {
          selectChip(emoji, chip);
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      dragCleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        if (ghost) ghost.remove();
      };
    });
  }

  let downPt: { x: number; y: number } | null = null;
  candy.addEventListener("pointerdown", (e) => {
    downPt = { x: e.clientX, y: e.clientY };
  });
  candy.addEventListener("pointerup", (e) => {
    if (dragging || !downPt) return;
    const moved = Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y);
    downPt = null;
    if (moved > 16) return;
    if (selected) placeDecoration(selected, e.clientX, e.clientY);
    else eat();
  });

  return {
    unmount() {
      alive = false;
      if (dragCleanup) dragCleanup();
      document.getElementById(STYLE_ID)?.remove();
      root.replaceChildren();
      root.removeAttribute("style");
    },
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function inside(x: number, y: number, r: DOMRect): boolean {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

const game: Game = {
  id: "cotton-candy",
  title: "Cotton Candy",
  tile: "🍭",
  color: "#ff8fc7",
  mount,
};

export default game;
