import type { GameEngine } from "./types";
import { ticTacToeEngine } from "./tic-tac-toe";
import { checkersEngine } from "./checkers";
import { battleshipsEngine } from "./battleships";
import { chessEngine } from "./chess";

// Battleships is built from the generic settle-then-play engine
// (api/src/games/setup-game.ts). Card and tile games can plug into the same
// factory the same way (e.g. `createSetupGame({ createMaterials: createCardDeck, … })`).
export const GAME_REGISTRY: Record<string, GameEngine> = {
  "tic-tac-toe": ticTacToeEngine,
  checkers: checkersEngine,
  battleships: battleshipsEngine,
  chess: chessEngine,
};

export function getGameEngine(gameType: string): GameEngine | null {
  return GAME_REGISTRY[gameType] ?? null;
}