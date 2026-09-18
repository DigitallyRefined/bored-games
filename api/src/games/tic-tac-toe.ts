import type { GameEngine, GameOverResult } from "./types";

export type TicTacToePlayer = "X" | "O";
export type TicTacToeCell = TicTacToePlayer | null;
export type TicTacToeBoard = TicTacToeCell[];

export interface TicTacToeState {
  board: TicTacToeBoard;
  currentPlayerIndex: number;
}

const WINNING_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function doesWin(board: TicTacToeBoard, player: TicTacToePlayer): number[] | null {
  for (const line of WINNING_LINES) {
    if (
      board[line[0]] === player &&
      board[line[1]] === player &&
      board[line[2]] === player
    ) {
      return line;
    }
  }
  return null;
}

export const ticTacToeEngine: GameEngine = {
  playerCount: { min: 2, max: 2 },

  createInitialState(playerCount: number): TicTacToeState {
    return {
      board: Array<TicTacToeCell>(9).fill(null),
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
    const symbol = this.getPlayerSymbol(playerIndex) as TicTacToePlayer;
    const board = [...state.board];
    board[cell] = symbol;
    return {
      board,
      currentPlayerIndex: (playerIndex + 1) % playerCount,
    };
  },

  checkGameOver(state: TicTacToeState): GameOverResult | null {
    for (let i = 0; i < 2; i++) {
      const symbol = (i === 0 ? "X" : "O") as TicTacToePlayer;
      if (doesWin(state.board, symbol)) {
        return { winnerIndex: i, isDraw: false };
      }
    }
    if (state.board.every((cell) => cell !== null)) {
      return { winnerIndex: null, isDraw: true };
    }
    return null;
  },

  getPublicState(state: TicTacToeState): TicTacToeState {
    return state;
  },
};