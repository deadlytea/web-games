import "./launcher.css";
import { games } from "./registry";
import type { Game, GameInstance } from "./types";

export function startLauncher(app: HTMLElement) {
  showGrid(app);
}

function showGrid(app: HTMLElement) {
  app.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "launcher";

  for (const game of games) {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.style.background = game.color;
    tile.innerHTML = `<span>${game.tile}</span><span class="tile__label">${game.title}</span>`;
    tile.addEventListener("click", () => openGame(app, game));
    grid.appendChild(tile);
  }

  app.appendChild(grid);
}

function openGame(app: HTMLElement, game: Game) {
  app.replaceChildren();

  const stage = document.createElement("div");
  stage.className = "stage";

  const host = document.createElement("div");
  host.className = "stage__host";

  const home = document.createElement("button");
  home.className = "stage__home";
  home.textContent = "🏠";
  home.setAttribute("aria-label", "Back to games");

  stage.append(host, home);
  app.appendChild(stage);

  const instance: GameInstance = game.mount(host);
  home.addEventListener("click", () => {
    instance.unmount();
    showGrid(app);
  });
}
