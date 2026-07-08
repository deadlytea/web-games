export interface Game {
  id: string;
  title: string;
  /** Big emoji or short label shown on the launcher tile. */
  tile: string;
  /** Tile background color. */
  color: string;
  /** Mount the game into `root`; return a handle to tear it down. */
  mount: (root: HTMLElement) => GameInstance;
}

export interface GameInstance {
  unmount: () => void;
}
