import { useCallback, useState } from "react";

import {
  createInitialBoard,
  outcomeOf,
  type TicTacToeBoard,
  type TicTacToeCell,
  type TicTacToePlayer,
} from "@shared/games/tic-tac-toe";

export type Player = TicTacToePlayer;
export type CellValue = TicTacToeCell;
export type Board = TicTacToeBoard;

export interface GameState {
  board: Board;
  currentPlayer: Player;
  winner: Player | "draw" | null;
  winningLine: number[] | null;
  isGameOver: boolean;
  nextPlayer: Player | null;
}

export function getInitialBoard(): Board {
  return createInitialBoard();
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

      const outcome = outcomeOf(nextBoard);
      if (outcome.winner !== null) {
        setWinner(outcome.winner);
        setWinningLine(outcome.winningLine);
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