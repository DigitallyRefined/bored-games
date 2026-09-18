import type { GameEngine } from "./types";
import { ticTacToeEngine } from "./tic-tac-toe";
import { checkersEngine } from "./checkers";

export const GAME_REGISTRY: Record<string, GameEngine> = {
  "tic-tac-toe": ticTacToeEngine,
  checkers: checkersEngine,
};

export function getGameEngine(gameType: string): GameEngine | null {
  return GAME_REGISTRY[gameType] ?? null;
}