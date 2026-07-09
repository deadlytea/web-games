import type { Game } from "./types";
import tapTheShapes from "./games/tap-the-shapes";
import cottonCandy from "./games/cotton-candy";
import balloonPop from "./games/balloon-pop";

// Add a game: build it under src/games/<name>/ exporting a Game, then list it here.
export const games: Game[] = [tapTheShapes, cottonCandy, balloonPop];
