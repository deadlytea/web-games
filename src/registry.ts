import type { Game } from "./types";
import tapTheShapes from "./games/tap-the-shapes";

// Add a game: build it under src/games/<name>/ exporting a Game, then list it here.
export const games: Game[] = [tapTheShapes];
