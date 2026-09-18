import type { GameEngine } from "./types";
import {
  applyMove,
  checkOutcome,
  createInitialState,
  validateMove,
  type ChessMove,
  type ChessOwner,
  type ChessState,
} from "@shared/games/chess";

export interface ChessMoveData {
  from: number;
  to: number;
  promotion?: string;
}

export const chessEngine: GameEngine = {
  playerCount: { min: 2, max: 2 },

  createInitialState(_playerCount: number): ChessState {
    return createInitialState();
  },

  getPlayerSymbol(playerIndex: number): string {
    return playerIndex === 0 ? "White" : "Black";
  },

  validateMove(
    state: ChessState,
    moveData: any,
    playerIndex: number
  ): boolean {
    if (state.currentPlayerIndex !== playerIndex) return false;
    const { from, to, promotion } = (moveData ?? {}) as ChessMoveData;
    if (typeof from !== "number" || typeof to !== "number") return false;
    return validateMove(
      state,
      { from, to, promotion: promotion as any },
      playerIndex
    );
  },

  applyMove(
    state: ChessState,
    moveData: ChessMoveData,
    _playerIndex: number,
    _playerCount: number
  ): ChessState {
    const { from, to, promotion } = moveData;
    const move: ChessMove = { from, to };
    if (promotion) move.promotion = promotion as any;
    return applyMove(state, move);
  },

  checkGameOver(state: ChessState) {
    return checkOutcome(state);
  },

  getPublicState(state: ChessState): ChessState {
    return state;
  },
};
