// Pure Tic-Tac-Toe rules shared between the API engine
// (api/src/games/tic-tac-toe.ts) and the app (app/src/hooks/useTicTacToe.ts,
// useOnlineTicTacToe.ts and the play-online screen). No server or UI
// dependencies.
//
// The board is a 9-cell row-major array. Player 0 plays "X" and moves first;
// player 1 plays "O".

export type TicTacToePlayer = "X" | "O";
export type TicTacToeCell = TicTacToePlayer | null;
export type TicTacToeBoard = TicTacToeCell[];

export const CELL_COUNT = 9;

export const WINNING_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createInitialBoard(): TicTacToeBoard {
  return Array<TicTacToeCell>(CELL_COUNT).fill(null);
}

// Returns the winning line held by `player`, or null.
export function winningLineFor(
  board: TicTacToeBoard,
  player: TicTacToePlayer | null
): number[] | null {
  if (!player) return null;
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

export interface TicTacToeOutcome {
  winner: TicTacToePlayer | "draw" | null;
  winningLine: number[] | null;
}

// Full outcome of a board. A winner takes precedence over a full board,
// and the captured winning line is useful for highlighting in the UI.
export function outcomeOf(board: TicTacToeBoard): TicTacToeOutcome {
  for (const symbol of ["X", "O"] as TicTacToePlayer[]) {
    const line = winningLineFor(board, symbol);
    if (line) return { winner: symbol, winningLine: line };
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: "draw", winningLine: null };
  }
  return { winner: null, winningLine: null };
}

export interface GameOverResult {
  winnerIndex: number | null;
  isDraw: boolean;
}

// Index-based outcome for the server GameEngine (mirrors outcomeOf).
export function checkOutcome(board: TicTacToeBoard): GameOverResult | null {
  const outcome = outcomeOf(board);
  if (outcome.winner === "X") return { winnerIndex: 0, isDraw: false };
  if (outcome.winner === "O") return { winnerIndex: 1, isDraw: false };
  if (outcome.winner === "draw") return { winnerIndex: null, isDraw: true };
  return null;
}