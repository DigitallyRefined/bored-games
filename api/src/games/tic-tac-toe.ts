import type { GameEngine, GameOverResult } from "./types";
import {
  checkOutcome,
  createInitialBoard,
  type TicTacToeBoard,
} from "@shared/games/tic-tac-toe";

export type {
  TicTacToePlayer,
  TicTacToeCell,
  TicTacToeBoard,
} from "@shared/games/tic-tac-toe";

export interface TicTacToeState {
  board: TicTacToeBoard;
  currentPlayerIndex: number;
}

export const ticTacToeEngine: GameEngine = {
  playerCount: { min: 2, max: 2 },

  createInitialState(playerCount: number): TicTacToeState {
    return {
      board: createInitialBoard(),
      currentPlayerIndex: 0,
    };
  },

  getPlayerSymbol(playerIndex: number): string {
    return playerIndex === 0 ? "X" : "O";
  },

  validateMove(state: TicTacToeState, moveData: any, playerIndex: number): boolean {
    if (state.currentPlayerIndex !== playerIndex) return false;

    const { cell } = moveData ?? {};
    if (typeof cell !== "number") return false;
    if (!Number.isInteger(cell)) return false;
    if (cell < 0 || cell > 8) return false;
    if (state.board[cell] !== null) return false;

    return true;
  },

  applyMove(
    state: TicTacToeState,
    moveData: any,
    playerIndex: number,
    playerCount: number
  ): TicTacToeState {
    const { cell } = moveData;
    const symbol = this.getPlayerSymbol(playerIndex) as "X" | "O";
    const board = [...state.board];
    board[cell] = symbol;
    return {
      board,
      currentPlayerIndex: (playerIndex + 1) % playerCount,
    };
  },

  checkGameOver(state: TicTacToeState): GameOverResult | null {
    return checkOutcome(state.board);
  },

  getPublicState(state: TicTacToeState): TicTacToeState {
    return state;
  },
};