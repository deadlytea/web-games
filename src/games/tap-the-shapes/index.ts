import type { Game, GameInstance } from "../../types";
import { pop } from "../../sound";
import { SHAPES, shapeSvg, type ShapeDef } from "./shapes";

const TARGET_ON_SCREEN = 5;
const SIZE_VW = 22; // shape size relative to viewport

function mount(root: HTMLElement): GameInstance {
  root.style.position = "absolute";
  root.style.inset = "0";
  root.style.overflow = "hidden";

  let alive = true;
  const active = new Set<HTMLElement>();

  function spawn() {
    if (!alive) return;
    const def = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const el = makeShape(def);
    active.add(el);
    root.appendChild(el);

    el.animate(
      [
        { transform: "scale(0)", opacity: 0 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 260, easing: "cubic-bezier(.34,1.56,.64,1)" }
    );

    const onTap = (e: Event) => {
      e.preventDefault();
      if (!active.has(el)) return;
      active.delete(el);
      pop(def.freq);
      const anim = el.animate(
        [
          { transform: "scale(1)", opacity: 1 },
          { transform: "scale(1.6)", opacity: 0 },
        ],
        { duration: 220, easing: "ease-out" }
      );
      anim.onfinish = () => {
        el.remove();
        spawn();
      };
    };
    el.addEventListener("pointerdown", onTap);
  }

  function makeShape(def: ShapeDef): HTMLElement {
    const el = document.createElement("div");
    el.innerHTML = shapeSvg(def);
    el.style.position = "absolute";
    el.style.width = `${SIZE_VW}vmin`;
    el.style.height = `${SIZE_VW}vmin`;
    el.style.cursor = "pointer";
    el.style.filter = "drop-shadow(0 6px 6px rgba(0,0,0,.35))";
    const pad = SIZE_VW;
    el.style.left = `${rand(pad, 100 - pad * 2)}vmin`;
    el.style.top = `${rand(pad, 100 - pad * 2)}vmin`;
    const svg = el.firstElementChild as SVGElement | null;
    if (svg) {
      svg.style.width = "100%";
      svg.style.height = "100%";
    }
    return el;
  }

  for (let i = 0; i < TARGET_ON_SCREEN; i++) spawn();

  return {
    unmount() {
      alive = false;
      active.clear();
      root.replaceChildren();
    },
  };
}

function rand(min: number, span: number): number {
  return min + Math.random() * span;
}

const game: Game = {
  id: "tap-the-shapes",
  title: "Shapes",
  tile: "⭐️",
  color: "#8ecae6",
  mount,
};

export default game;
