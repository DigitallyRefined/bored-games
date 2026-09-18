import { useCallback, useMemo, useState } from "react";

import * as core from "@/lib/checkers";
import type { CheckersBoard, CheckersOwner } from "@/lib/checkers";

export function useCheckers() {
  const [board, setBoard] = useState<CheckersBoard>(core.createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState<CheckersOwner>(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [path, setPath] = useState<number[]>([]);
  const [winner, setWinner] = useState<CheckersOwner | "draw" | null>(null);
  const [lastMovePath, setLastMovePath] = useState<number[] | null>(null);
  const [movesWithoutProgress, setMovesWithoutProgress] = useState(0);

  const isGameOver = winner !== null;

  const sources = useMemo(
    () => (isGameOver ? [] : core.playableSources(board, currentPlayer)),
    [board, currentPlayer, isGameOver]
  );

  const destinations = useMemo(() => {
    if (isGameOver) return [];
    if (path.length > 0) return core.continuationOptions(board, path).map((o) => o.to);
    if (selected === null) return [];
    return core.legalOptions(board, selected).map((o) => o.to);
  }, [board, path, selected, isGameOver]);

  const captureDestinations = useMemo(() => {
    if (isGameOver) return [];
    if (path.length > 0)
      return core.continuationOptions(board, path).filter((o) => o.jumped !== null).map((o) => o.to);
    if (selected === null) return [];
    return core.legalOptions(board, selected).filter((o) => o.jumped !== null).map((o) => o.to);
  }, [board, path, selected, isGameOver]);

  const commitMove = useCallback(
    (movePath: number[]) => {
      const result = core.applyPath(board, movePath);
      const progressed = result.capturedCount > 0 || result.promoted;
      const nextMovesWithoutProgress = progressed ? 0 : movesWithoutProgress + 1;
      const nextPlayer: CheckersOwner = currentPlayer === 0 ? 1 : 0;
      const outcome = core.gameResult(result.board, nextPlayer, nextMovesWithoutProgress);

      setBoard(result.board);
      setLastMovePath(movePath);
      setPath([]);
      setSelected(null);
      if (outcome) {
        setWinner(outcome.isDraw ? "draw" : outcome.winnerIndex);
      } else {
        setCurrentPlayer(nextPlayer);
        setMovesWithoutProgress(nextMovesWithoutProgress);
      }
    },
    [board, currentPlayer, movesWithoutProgress]
  );

  const pressSquare = useCallback(
    (index: number) => {
      if (isGameOver) return;

      // A capture chain is in progress: only continue-jump destinations are legal.
      if (path.length > 0) {
        const options = core.continuationOptions(board, path);
        if (!options.some((o) => o.to === index)) return;
        const nextPath = [...path, index];
        const { promoted } = core.applyPath(board, nextPath);
        if (promoted || core.continuationOptions(board, nextPath).length === 0) {
          commitMove(nextPath);
        } else {
          setPath(nextPath);
          setSelected(index);
        }
        return;
      }

      if (selected === null) {
        if (!sources.includes(index)) return;
        setSelected(index);
        return;
      }

      if (index === selected) {
        setSelected(null);
        return;
      }

      const options = core.legalOptions(board, selected);
      if (options.some((o) => o.to === index)) {
        const nextPath = [selected, index];
        const { promoted } = core.applyPath(board, nextPath);
        if (promoted || core.continuationOptions(board, nextPath).length === 0) {
          commitMove(nextPath);
        } else {
          setPath(nextPath);
          setSelected(index);
        }
        return;
      }

      if (sources.includes(index)) {
        setSelected(index);
        return;
      }

      setSelected(null);
    },
    [board, isGameOver, path, selected, sources, commitMove]
  );

  const reset = useCallback(() => {
    setBoard(core.createInitialBoard());
    setCurrentPlayer(0);
    setSelected(null);
    setPath([]);
    setWinner(null);
    setLastMovePath(null);
    setMovesWithoutProgress(0);
  }, []);

  return {
    board,
    currentPlayer,
    selected,
    path,
    sources,
    destinations,
    captureDestinations,
    lastMovePath,
    winner,
    isGameOver,
    pressSquare,
    reset,
  };
}