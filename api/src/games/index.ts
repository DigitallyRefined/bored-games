import type { GameEngine } from "./types";
import { ticTacToeEngine } from "./tic-tac-toe";

export const GAME_REGISTRY: Record<string, GameEngine> = {
  "tic-tac-toe": ticTacToeEngine,
};

export function getGameEngine(gameType: string): GameEngine | null {
  return GAME_REGISTRY[gameType] ?? null;
}