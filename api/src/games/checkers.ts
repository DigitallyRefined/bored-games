import type { GameOverResult, GameEngine } from "./types";
import {
  applyPath,
  checkOutcome,
  createInitialBoard,
  validatePath,
  type CheckersBoard,
  type CheckersOwner,
} from "@shared/games/checkers";

export interface CheckersMoveData {
  path: number[];
}

export interface CheckersState {
  board: CheckersBoard;
  currentPlayerIndex: number;
  lastMovePath: number[] | null;
  movesWithoutProgress: number;
}

export const checkersEngine: GameEngine = {
  playerCount: { min: 2, max: 2 },

  createInitialState(playerCount: number): CheckersState {
    return {
      board: createInitialBoard(),
      currentPlayerIndex: 0,
      lastMovePath: null,
      movesWithoutProgress: 0,
    };
  },

  getPlayerSymbol(playerIndex: number): string {
    return playerIndex === 0 ? "Dark" : "Light";
  },

  validateMove(state: CheckersState, moveData: any, playerIndex: number): boolean {
    if (state.currentPlayerIndex !== playerIndex) return false;
    const { path } = moveData ?? {};
    if (!Array.isArray(path)) return false;
    return validatePath(state.board, path, playerIndex as CheckersOwner);
  },

  applyMove(
    state: CheckersState,
    moveData: CheckersMoveData,
    playerIndex: number,
    playerCount: number
  ): CheckersState {
    const { path } = moveData;
    const result = applyPath(state.board, path);
    const progressed = result.capturedCount > 0 || result.promoted;
    return {
      board: result.board,
      currentPlayerIndex: (playerIndex + 1) % playerCount,
      lastMovePath: path,
      movesWithoutProgress: progressed ? 0 : state.movesWithoutProgress + 1,
    };
  },

  checkGameOver(state: CheckersState): GameOverResult | null {
    return checkOutcome(
      state.board,
      state.currentPlayerIndex as CheckersOwner,
      state.movesWithoutProgress
    );
  },

  getPublicState(state: CheckersState): CheckersState {
    return state;
  },
};