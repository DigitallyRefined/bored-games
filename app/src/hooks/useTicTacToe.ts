import { useCallback, useState } from "react";

export type Player = "X" | "O";
export type CellValue = Player | null;
export type Board = CellValue[];

export interface GameState {
  board: Board;
  currentPlayer: Player;
  winner: Player | "draw" | null;
  winningLine: number[] | null;
  isGameOver: boolean;
  nextPlayer: Player | null;
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

export function getInitialBoard(): Board {
  return Array(9).fill(null);
}

export function useTicTacToe() {
  const [board, setBoard] = useState<Board>(getInitialBoard);
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  const currentPlayer: Player = isXNext ? "X" : "O";
  const isGameOver = winner !== null || board.every((cell) => cell !== null);

  const makeMove = useCallback(
    (index: number) => {
      const isFilled = board[index] !== null;
      if (isFilled || isGameOver) return;

      const nextBoard = [...board];
      nextBoard[index] = currentPlayer;
      setBoard(nextBoard);

      // Check for a winner
      for (const line of WINNING_LINES) {
        const [a, b, c] = line;
        if (
          nextBoard[a] !== null &&
          nextBoard[a] === nextBoard[b] &&
          nextBoard[a] === nextBoard[c]
        ) {
          setWinner(nextBoard[a] as Player);
          setWinningLine(line);
          return;
        }
      }

      // Check for a draw
      if (nextBoard.every((cell) => cell !== null)) {
        setWinner("draw");
        return;
      }

      setIsXNext((prev) => !prev);
    },
    [board, currentPlayer, isGameOver]
  );

  const reset = useCallback(() => {
    setBoard(getInitialBoard());
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
  }, []);

  return {
    board,
    currentPlayer,
    winner,
    winningLine,
    isGameOver,
    makeMove,
    reset,
  };
}