import type { Game, GameInstance } from "../../types";
import { pop } from "../../sound";

// A calm, multi-stage flower game: dig, seed, cover, water, grow through
// day/night, pick into a basket, arrange in a vase, then colour the blooms.
// Every action is a forgiving tap. Prev/Next move between stages; going back
// resets that stage so it can be replayed.

const POS = [16, 38, 60, 82]; // flower x-positions in the 0..100 field viewBox
const BASE_Y = 45; // ground line where mounds sit
const VB_W = 100;
const VB_H = 60;

interface Flower {
  base: string; // default petal colour
  center: string;
  dug: boolean;
  seeded: boolean;
  filled: boolean;
  watered: boolean;
  grown: number; // 0..3
  picked: boolean;
  inVase: boolean;
  petalColor: string;
}

function makeFlowers(): Flower[] {
  const defs = [
    { base: "#ff6b9d", center: "#ffd23f" },
    { base: "#ffd23f", center: "#e0872a" },
    { base: "#b06bff", center: "#ffd23f" },
    { base: "#ff8c42", center: "#ffd23f" },
  ];
  return defs.map((d) => ({
    ...d,
    dug: false,
    seeded: false,
    filled: false,
    watered: false,
    grown: 0,
    picked: false,
    inVase: false,
    petalColor: d.base,
  }));
}

const PALETTE = [
  "#ff5d73",
  "#ff9f4a",
  "#ffd166",
  "#8ac926",
  "#4cc9f0",
  "#9b5de5",
  "#f15bb5",
  "#ffffff",
];

const STAGES = [
  { id: "dig", label: "Dig the holes", emoji: "🕳️" },
  { id: "seed", label: "Drop the seeds", emoji: "🌰" },
  { id: "fill", label: "Cover them up", emoji: "🪱" },
  { id: "water", label: "Water the seeds", emoji: "💧" },
  { id: "grow", label: "Watch them grow", emoji: "🌞" },
  { id: "pick", label: "Pick the flowers", emoji: "🧺" },
  { id: "arrange", label: "Fill the vase", emoji: "🏺" },
  { id: "paint", label: "Colour them in", emoji: "🎨" },
] as const;

const STYLE_ID = "pf-style";
const CSS = `
.pf-root { position:absolute; inset:0; display:flex; flex-direction:column;
  overflow:hidden; touch-action:manipulation; user-select:none;
  font-family:"Baloo 2","Fredoka One","Comic Sans MS","Arial Rounded MT Bold",ui-rounded,sans-serif; }
.pf-prompt { flex:0 0 auto; text-align:center; padding:.35em 2.6em; z-index:5;
  font-size:clamp(18px,5vw,30px); font-weight:800; color:#43310e;
  text-shadow:0 2px 0 rgba(255,255,255,.75); }
.pf-scene { position:relative; flex:1 1 auto; min-height:0; overflow:hidden;
  background:linear-gradient(180deg,#bfeaff 0%,#e6f8ff 62%); transition:background .9s ease; }
.pf-scene.pf-night { background:linear-gradient(180deg,#16205a 0%,#33306e 62%); }
.pf-scene > svg { position:absolute; inset:0; width:100%; height:100%; }
.pf-hit { cursor:pointer; }
.pf-hint { fill:none; stroke:#fff; stroke-width:1.4; opacity:.9;
  transform-box:fill-box; transform-origin:center; animation:pf-ring 1.4s ease-out infinite; }
@keyframes pf-ring { 0%{transform:scale(.5);opacity:.9;} 100%{transform:scale(1.7);opacity:0;} }
.pf-sun { position:absolute; top:6%; left:50%; width:14vmin; height:14vmin; margin-left:-7vmin;
  border:none; background:transparent; font-size:12vmin; line-height:1; cursor:pointer; z-index:4;
  filter:drop-shadow(0 3px 6px rgba(0,0,0,.25)); transition:transform .9s ease, top .9s ease; }
.pf-sun:active { transform:scale(.9); }
.pf-days { position:absolute; top:3%; right:4%; display:flex; gap:.4em; z-index:4; }
.pf-day-pip { width:2.6vmin; height:2.6vmin; border-radius:50%; background:rgba(255,255,255,.35);
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.15); }
.pf-day-pip.pf-on { background:#ffe27a; box-shadow:0 0 6px #ffd23f; }
.pf-basket { position:absolute; bottom:3%; right:3%; width:30vmin; height:24vmin; z-index:4;
  display:flex; align-items:flex-end; justify-content:center; }
.pf-basket__emoji { position:absolute; bottom:0; font-size:16vmin; line-height:1;
  filter:drop-shadow(0 3px 4px rgba(0,0,0,.25)); }
.pf-basket__flowers { position:absolute; bottom:12vmin; z-index:1; display:flex; justify-content:center; width:100%; }
.pf-basket__flowers svg { width:9vmin; height:9vmin; margin:0 -1.4vmin; }
.pf-fly { position:fixed; z-index:60; pointer-events:none; filter:drop-shadow(0 4px 5px rgba(0,0,0,.25)); }
.pf-arrange { position:absolute; inset:0; display:flex; align-items:center; z-index:3; }
.pf-arrange__basket { flex:1; display:flex; flex-wrap:wrap; align-content:center; justify-content:center;
  gap:1vmin; padding:2vmin; }
.pf-arrange__basket button { border:none; background:transparent; padding:0; cursor:pointer;
  width:20vmin; height:20vmin; filter:drop-shadow(0 3px 4px rgba(0,0,0,.2)); transition:transform .15s; }
.pf-arrange__basket button:active { transform:scale(.9); }
.pf-arrange__vase { flex:1; display:flex; align-items:center; justify-content:center; }
.pf-arrange__vase svg { width:70%; max-width:52vmin; height:auto; }
.pf-basket-label { position:absolute; top:6%; left:0; right:50%; text-align:center; font-weight:800;
  color:#7a5a2a; font-size:clamp(14px,3.5vw,22px); }
.pf-paint-wrap { position:absolute; inset:0; display:flex; flex-direction:column; z-index:3; }
.pf-paint-stage { flex:1; min-height:0; display:flex; align-items:center; justify-content:center; }
.pf-paint-stage svg { width:80%; max-width:64vmin; height:100%; }
.pf-pt, .pf-vasehit { cursor:pointer; }
.pf-palette { flex:0 0 auto; display:flex; justify-content:center; flex-wrap:wrap; gap:1.6vmin;
  padding:1.4vmin 2vmin calc(1.4vmin + env(safe-area-inset-bottom)); }
.pf-swatch { width:11vmin; height:11vmin; max-width:56px; max-height:56px; border-radius:50%;
  border:3px solid #fff; box-shadow:0 3px 0 rgba(0,0,0,.2); cursor:pointer; transition:transform .12s; }
.pf-swatch:active { transform:scale(.88); }
.pf-swatch.pf-sel { transform:scale(1.18); box-shadow:0 0 0 3px #43310e, 0 3px 0 rgba(0,0,0,.2); }
.pf-nav { flex:0 0 auto; display:flex; align-items:center; justify-content:space-between; gap:1vmin;
  padding:.6vmin 3vmin calc(.6vmin + env(safe-area-inset-bottom)); z-index:5; }
.pf-arrow { border:none; border-radius:999px; width:16vmin; height:16vmin; max-width:74px; max-height:74px;
  font-size:8vmin; line-height:1; background:#fff; color:#ff6b9d; cursor:pointer;
  box-shadow:0 4px 0 rgba(0,0,0,.18); transition:transform .12s; display:flex; align-items:center; justify-content:center; }
.pf-arrow:active { transform:translateY(2px); box-shadow:0 2px 0 rgba(0,0,0,.18); }
.pf-arrow:disabled { opacity:.3; cursor:default; box-shadow:none; }
.pf-arrow.pf-pulse { animation:pf-pulse 1s ease-in-out infinite; color:#fff; background:#4bd06a; }
@keyframes pf-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.14);} }
.pf-pips { display:flex; gap:1.3vmin; }
.pf-pip { width:2.4vmin; height:2.4vmin; max-width:12px; max-height:12px; border-radius:50%;
  background:rgba(0,0,0,.16); }
.pf-pip.pf-pip-on { background:#ff6b9d; }
`;

// ---- SVG builders --------------------------------------------------------

function petals(cx: number, cy: number, r: number, color: string, cls: string, data: string): string {
  let out = "";
  const n = 6;
  for (let k = 0; k < n; k++) {
    const a = (k * 360) / n;
    const px = cx + Math.cos((a * Math.PI) / 180) * r * 0.62;
    const py = cy + Math.sin((a * Math.PI) / 180) * r * 0.62;
    out += `<ellipse class="${cls}" ${data} cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" rx="${(r * 0.5).toFixed(2)}" ry="${(r * 0.28).toFixed(2)}" fill="${color}" transform="rotate(${a} ${px.toFixed(2)} ${py.toFixed(2)})"/>`;
  }
  return out;
}

function bloomSvg(color: string, center: string, size: number): string {
  return `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style="width:${size}px;height:${size}px">
    ${petals(20, 20, 12, color, "", "")}
    <circle cx="20" cy="20" r="6" fill="${center}"/>
  </svg>`;
}

function plantMarkup(i: number, f: Flower): string {
  const x = POS[i];
  if (!f.dug) return "";

  if (f.dug && !f.filled) {
    // open hole, with optional seed
    let s = `<ellipse cx="${x}" cy="${BASE_Y}" rx="6.5" ry="3" fill="#4a3421"/>
      <ellipse cx="${x}" cy="${BASE_Y + 0.5}" rx="4.6" ry="1.9" fill="#2f2013"/>`;
    if (f.seeded) {
      s += `<ellipse cx="${x}" cy="${BASE_Y + 0.2}" rx="1.7" ry="1" fill="#8a6a3a" transform="rotate(-20 ${x} ${BASE_Y})"/>`;
    }
    return s;
  }

  // filled: mound (+ plant depending on growth)
  const moundTop = f.watered ? "#6b4a2b" : "#7d5733";
  const moundBase = f.watered ? "#4e3520" : "#6b4a2b";
  let s = `<ellipse cx="${x}" cy="${BASE_Y}" rx="7" ry="3.4" fill="${moundBase}"/>
    <ellipse cx="${x}" cy="${BASE_Y - 0.7}" rx="6.3" ry="2.7" fill="${moundTop}"/>`;

  if (f.picked) {
    s += `<rect x="${x - 0.5}" y="${BASE_Y - 4}" width="1" height="3.5" fill="#3a8a3a" rx="0.5"/>`;
    return s;
  }

  const stem = (top: number) =>
    `<rect x="${x - 0.7}" y="${top}" width="1.4" height="${(BASE_Y - top).toFixed(2)}" fill="#3a8a3a" rx="0.7"/>`;
  const leaf = (yy: number, dir: number) =>
    `<ellipse cx="${x + dir * 3}" cy="${yy}" rx="3" ry="1.4" fill="#4bbf59" transform="rotate(${dir * 28} ${x + dir * 3} ${yy})"/>`;

  if (f.grown >= 3) {
    const top = BASE_Y - 15;
    s += stem(top) + leaf(BASE_Y - 8, 1) + leaf(BASE_Y - 11, -1);
    s += petals(x, top, 6, f.petalColor, "", "");
    s += `<circle cx="${x}" cy="${top}" r="2.4" fill="${f.center}"/>`;
  } else if (f.grown === 2) {
    const top = BASE_Y - 9;
    s += stem(top) + leaf(BASE_Y - 6, 1);
    s += `<ellipse cx="${x}" cy="${top}" rx="2.3" ry="3.2" fill="${f.petalColor}"/>`;
    s += `<path d="M ${x - 2.3} ${top} Q ${x} ${top - 1} ${x + 2.3} ${top}" fill="none" stroke="#3a8a3a" stroke-width="0.8"/>`;
  } else if (f.grown === 1) {
    const top = BASE_Y - 4.5;
    s += stem(top) + leaf(top + 0.5, 1) + leaf(top + 1.5, -1);
  }
  return s;
}

function clouds(): string {
  return `<g fill="#ffffff" opacity=".85">
    <ellipse cx="22" cy="10" rx="7" ry="3"/><ellipse cx="28" cy="9" rx="5" ry="2.6"/>
    <ellipse cx="74" cy="14" rx="6" ry="2.6"/><ellipse cx="79" cy="13.4" rx="4.2" ry="2.2"/>
  </g>`;
}

function fieldSvg(stageId: string, flowers: Flower[], night: boolean): string {
  const grass = `<defs><linearGradient id="pf-grass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fd66a"/><stop offset="1" stop-color="#5fb04a"/></linearGradient></defs>`;
  const ground = `<rect x="0" y="${VB_H * 0.62}" width="${VB_W}" height="${VB_H}" fill="url(#pf-grass)"/>`;

  let plants = "";
  for (let i = 0; i < flowers.length; i++) plants += plantMarkup(i, flowers[i]);

  // interactive spots + hints for the active stage
  let hits = "";
  for (let i = 0; i < flowers.length; i++) {
    const f = flowers[i];
    let active = false;
    if (stageId === "dig") active = !f.dug;
    else if (stageId === "seed") active = f.dug && !f.seeded;
    else if (stageId === "fill") active = f.seeded && !f.filled;
    else if (stageId === "water") active = f.filled && !f.watered;
    else if (stageId === "pick") active = f.grown >= 3 && !f.picked;
    if (!active) continue;
    const cy = stageId === "pick" ? BASE_Y - 12 : BASE_Y;
    hits += `<circle class="pf-hint" cx="${POS[i]}" cy="${cy}" r="7"/>`;
    hits += `<circle class="pf-hit" data-idx="${i}" cx="${POS[i]}" cy="${cy}" r="10" fill="#fff" fill-opacity="0"/>`;
  }

  return `<svg viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
    ${grass}${night ? "" : clouds()}${ground}${plants}${hits}
  </svg>`;
}

// ---- Game ----------------------------------------------------------------

function mount(root: HTMLElement): GameInstance {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const flowers = makeFlowers();
  let vaseColor = "#e7c9a0";
  let cur = 0;
  let cleanup: (() => void) | null = null;

  root.className = "pf-root";
  const prompt = document.createElement("div");
  prompt.className = "pf-prompt";
  const scene = document.createElement("div");
  scene.className = "pf-scene";
  const nav = document.createElement("div");
  nav.className = "pf-nav";
  const prevBtn = document.createElement("button");
  prevBtn.className = "pf-arrow";
  prevBtn.textContent = "◀";
  prevBtn.setAttribute("aria-label", "Previous step");
  const pips = document.createElement("div");
  pips.className = "pf-pips";
  const nextBtn = document.createElement("button");
  nextBtn.className = "pf-arrow";
  nextBtn.textContent = "▶";
  nextBtn.setAttribute("aria-label", "Next step");
  nav.append(prevBtn, pips, nextBtn);
  root.append(prompt, scene, nav);

  function resetFrom(index: number) {
    const clearers: ((f: Flower) => void)[] = [
      (f) => (f.dug = false),
      (f) => (f.seeded = false),
      (f) => (f.filled = false),
      (f) => (f.watered = false),
      (f) => (f.grown = 0),
      (f) => (f.picked = false),
      (f) => (f.inVase = false),
      (f) => (f.petalColor = f.base),
    ];
    for (let j = index; j < clearers.length; j++) flowers.forEach(clearers[j]);
    if (index <= 7) vaseColor = "#e7c9a0";
  }

  function isComplete(): boolean {
    switch (STAGES[cur].id) {
      case "dig": return flowers.every((f) => f.dug);
      case "seed": return flowers.every((f) => f.seeded);
      case "fill": return flowers.every((f) => f.filled);
      case "water": return flowers.every((f) => f.watered);
      case "grow": return flowers.every((f) => f.grown >= 3);
      case "pick": return flowers.every((f) => f.picked);
      case "arrange": return flowers.every((f) => f.inVase);
      case "paint": return true;
    }
    return false;
  }

  function refreshNav() {
    prevBtn.disabled = cur === 0;
    nextBtn.disabled = cur === STAGES.length - 1;
    nextBtn.classList.toggle("pf-pulse", isComplete() && cur < STAGES.length - 1);
    pips.replaceChildren();
    for (let i = 0; i < STAGES.length; i++) {
      const p = document.createElement("div");
      p.className = "pf-pip" + (i === cur ? " pf-pip-on" : "");
      pips.appendChild(p);
    }
  }

  function flyTo(fromEl: Element, toX: number, toY: number, html: string, onDone: () => void) {
    const b = fromEl.getBoundingClientRect();
    const fly = document.createElement("div");
    fly.className = "pf-fly";
    fly.innerHTML = html;
    fly.style.left = `${b.left + b.width / 2}px`;
    fly.style.top = `${b.top + b.height / 2}px`;
    document.body.appendChild(fly);
    const anim = fly.animate(
      [
        { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", opacity: 1 },
        { transform: `translate(${toX - b.left - b.width / 2 - b.width / 2}px, ${toY - b.top - b.height / 2 - b.height / 2}px) scale(.6) rotate(20deg)`, opacity: 0.9 },
      ],
      { duration: 600, easing: "cubic-bezier(.4,0,.2,1)" }
    );
    anim.onfinish = () => { fly.remove(); onDone(); };
  }

  // ---- field stages (dig/seed/fill/water/pick) --------------------------

  function buildField(): () => void {
    const stageId = STAGES[cur].id;
    scene.classList.remove("pf-night");

    const draw = () => {
      scene.innerHTML = fieldSvg(stageId, flowers, false);
      if (stageId === "pick") {
        const basket = document.createElement("div");
        basket.className = "pf-basket";
        const blooms = flowers
          .filter((f) => f.picked)
          .map((f) => bloomSvg(f.petalColor, f.center, 40))
          .join("");
        basket.innerHTML = `<div class="pf-basket__emoji">🧺</div><div class="pf-basket__flowers">${blooms}</div>`;
        scene.appendChild(basket);
      }
      wire();
    };

    const wire = () => {
      scene.querySelectorAll<SVGElement>(".pf-hit").forEach((hit) => {
        hit.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          const i = Number(hit.getAttribute("data-idx"));
          const f = flowers[i];
          if (stageId === "dig") { f.dug = true; pop(200); draw(); }
          else if (stageId === "seed") { f.seeded = true; pop(330); draw(); }
          else if (stageId === "fill") { f.filled = true; pop(260); draw(); }
          else if (stageId === "water") { f.watered = true; pop(520); pop(700); draw(); }
          else if (stageId === "pick") {
            f.picked = true;
            pop(440);
            const basketEl = scene.querySelector(".pf-basket__emoji");
            const bb = basketEl?.getBoundingClientRect();
            flyTo(hit, bb ? bb.left + bb.width / 2 : window.innerWidth - 60, bb ? bb.top : window.innerHeight - 80, bloomSvg(f.petalColor, f.center, 70), draw);
            draw(); // remove from field immediately; fly overlays
          }
          refreshNav();
        });
      });
    };

    draw();
    refreshNav();
    return () => {};
  }

  // ---- grow stage -------------------------------------------------------

  function buildGrow(): () => void {
    let day = 0; // how many day/night cycles have passed
    let animating = false;
    scene.innerHTML = fieldSvg("grow", flowers, false);

    const sun = document.createElement("button");
    sun.className = "pf-sun";
    sun.textContent = "🌞";
    sun.setAttribute("aria-label", "Pass a day");

    const days = document.createElement("div");
    days.className = "pf-days";
    const renderPips = () => {
      days.replaceChildren();
      for (let i = 0; i < 3; i++) {
        const p = document.createElement("div");
        p.className = "pf-day-pip" + (i < day ? " pf-on" : "");
        days.appendChild(p);
      }
    };
    renderPips();
    scene.append(sun, days);

    const redrawField = () => {
      // replace only the svg, keep sun + days overlays
      const old = scene.querySelector("svg");
      const tmp = document.createElement("div");
      tmp.innerHTML = fieldSvg("grow", flowers, scene.classList.contains("pf-night"));
      const fresh = tmp.querySelector("svg");
      if (old && fresh) old.replaceWith(fresh);
    };

    const passDay = () => {
      if (animating || day >= 3) return;
      animating = true;
      // sunset -> night
      scene.classList.add("pf-night");
      sun.textContent = "🌙";
      sun.style.top = "10%";
      const t1 = window.setTimeout(() => {
        // grow at dawn
        flowers.forEach((f) => { if (f.grown < 3) f.grown++; });
        day++;
        pop(330 + day * 90);
        redrawField();
        renderPips();
        scene.classList.remove("pf-night");
        sun.textContent = "🌞";
        sun.style.top = "6%";
        const t2 = window.setTimeout(() => {
          animating = false;
          if (day >= 3) sun.style.display = "none";
          refreshNav();
        }, 900);
        timers.push(t2);
      }, 950);
      timers.push(t1);
    };

    const timers: number[] = [];
    if (flowers.every((f) => f.grown >= 3)) sun.style.display = "none";
    sun.addEventListener("pointerdown", (e) => { e.preventDefault(); passDay(); });

    refreshNav();
    return () => { timers.forEach((t) => clearTimeout(t)); };
  }

  // ---- arrange stage ----------------------------------------------------

  function vaseSvg(vaseFill: string, stems: Flower[]): string {
    // fan the flowers out of the vase
    let blooms = "";
    const n = stems.length;
    stems.forEach((f, k) => {
      const spread = n > 1 ? (k / (n - 1) - 0.5) : 0;
      const topX = 50 + spread * 34;
      const topY = 30 - Math.abs(spread) * 6;
      blooms += `<path d="M50 66 Q${(50 + spread * 18).toFixed(1)} ${(48).toFixed(1)} ${topX.toFixed(1)} ${topY.toFixed(1)}" fill="none" stroke="#3a8a3a" stroke-width="2.4"/>`;
      blooms += petals(topX, topY, 9, f.petalColor, "", "");
      blooms += `<circle cx="${topX.toFixed(1)}" cy="${topY.toFixed(1)}" r="3.6" fill="${f.center}"/>`;
    });
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      ${blooms}
      <path d="M34 66 L66 66 L61 94 Q50 99 39 94 Z" fill="${vaseFill}" stroke="#b98d5a" stroke-width="1.5"/>
      <ellipse cx="50" cy="66" rx="16" ry="3.4" fill="#c79b68"/>
    </svg>`;
  }

  function buildArrange(): () => void {
    scene.classList.remove("pf-night");
    scene.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "pf-arrange";
    const basket = document.createElement("div");
    basket.className = "pf-arrange__basket";
    const label = document.createElement("div");
    label.className = "pf-basket-label";
    label.textContent = "🧺 Tap a flower";
    const vaseWrap = document.createElement("div");
    vaseWrap.className = "pf-arrange__vase";
    wrap.append(basket, vaseWrap);
    scene.append(label, wrap);

    const render = () => {
      basket.replaceChildren();
      flowers.forEach((f) => {
        if (f.inVase) return;
        const btn = document.createElement("button");
        btn.innerHTML = bloomSvg(f.petalColor, f.center, 120);
        btn.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          f.inVase = true;
          pop(500);
          const vaseEl = vaseWrap.getBoundingClientRect();
          flyTo(btn, vaseEl.left + vaseEl.width / 2, vaseEl.top + vaseEl.height * 0.35, bloomSvg(f.petalColor, f.center, 120), () => {});
          render();
          refreshNav();
        });
        basket.appendChild(btn);
      });
      label.style.visibility = flowers.some((f) => !f.inVase) ? "visible" : "hidden";
      vaseWrap.innerHTML = vaseSvg(vaseColor, flowers.filter((f) => f.inVase));
    };

    render();
    refreshNav();
    return () => {};
  }

  // ---- paint stage ------------------------------------------------------

  function buildPaint(): () => void {
    scene.classList.remove("pf-night");
    scene.innerHTML = "";
    let selected = PALETTE[0];

    const wrap = document.createElement("div");
    wrap.className = "pf-paint-wrap";
    const stage = document.createElement("div");
    stage.className = "pf-paint-stage";

    // enlarged vase of all grown flowers, petals tappable per flower
    const show = flowers;
    let blooms = "";
    const n = show.length;
    show.forEach((f, k) => {
      const spread = n > 1 ? (k / (n - 1) - 0.5) : 0;
      const topX = 50 + spread * 30;
      const topY = 26 - Math.abs(spread) * 4;
      blooms += `<path d="M50 64 Q${(50 + spread * 16).toFixed(1)} 46 ${topX.toFixed(1)} ${topY.toFixed(1)}" fill="none" stroke="#3a8a3a" stroke-width="2.4"/>`;
      blooms += petals(topX, topY, 11, f.petalColor, "pf-pt", `data-f="${k}"`);
      blooms += `<circle cx="${topX.toFixed(1)}" cy="${topY.toFixed(1)}" r="4.2" fill="${f.center}"/>`;
    });
    stage.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      ${blooms}
      <path class="pf-vasehit" d="M32 64 L68 64 L62 96 Q50 101 38 96 Z" fill="${vaseColor}" stroke="#b98d5a" stroke-width="1.5"/>
      <ellipse cx="50" cy="64" rx="18" ry="3.8" fill="#c79b68"/>
    </svg>`;

    const palette = document.createElement("div");
    palette.className = "pf-palette";
    PALETTE.forEach((c, i) => {
      const sw = document.createElement("button");
      sw.className = "pf-swatch" + (i === 0 ? " pf-sel" : "");
      sw.style.background = c;
      sw.setAttribute("aria-label", "Colour");
      sw.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        selected = c;
        palette.querySelectorAll(".pf-swatch").forEach((s) => s.classList.remove("pf-sel"));
        sw.classList.add("pf-sel");
      });
      palette.appendChild(sw);
    });

    wrap.append(stage, palette);
    scene.appendChild(wrap);

    stage.querySelectorAll<SVGElement>(".pf-pt").forEach((pt) => {
      pt.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const f = Number(pt.getAttribute("data-f"));
        flowers[f].petalColor = selected;
        stage.querySelectorAll(`.pf-pt[data-f="${f}"]`).forEach((p) => (p as SVGElement).setAttribute("fill", selected));
        pop(300 + f * 70);
      });
    });
    const vaseHit = stage.querySelector<SVGElement>(".pf-vasehit");
    vaseHit?.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      vaseColor = selected;
      vaseHit.setAttribute("fill", selected);
      pop(240);
    });

    refreshNav();
    return () => {};
  }

  // ---- stage controller -------------------------------------------------

  function renderStage() {
    if (cleanup) { cleanup(); cleanup = null; }
    const s = STAGES[cur];
    prompt.textContent = `${s.emoji} ${s.label}`;
    scene.innerHTML = "";
    switch (s.id) {
      case "grow": cleanup = buildGrow(); break;
      case "arrange": cleanup = buildArrange(); break;
      case "paint": cleanup = buildPaint(); break;
      default: cleanup = buildField(); break;
    }
  }

  prevBtn.addEventListener("click", () => {
    if (cur === 0) return;
    cur--;
    resetFrom(cur); // replay this stage fresh
    renderStage();
  });
  nextBtn.addEventListener("click", () => {
    if (cur >= STAGES.length - 1) return;
    cur++;
    renderStage();
  });

  renderStage();

  return {
    unmount() {
      if (cleanup) cleanup();
      document.querySelectorAll(".pf-fly").forEach((e) => e.remove());
      document.getElementById(STYLE_ID)?.remove();
      root.replaceChildren();
      root.removeAttribute("class");
      root.removeAttribute("style");
    },
  };
}

const game: Game = {
  id: "plant-flowers",
  title: "Plant Flowers",
  tile: "🌷",
  color: "#ff8fb1",
  mount,
};

export default game;
