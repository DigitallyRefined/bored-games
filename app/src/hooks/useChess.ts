import { useCallback, useMemo, useState } from "react";

import * as core from "@/lib/chess";
import type {
  ChessMove,
  ChessOwner,
  ChessPieceType,
  ChessState,
} from "@/lib/chess";

export function useChess() {
  const [state, setState] = useState<ChessState>(core.createInitialState);
  const [selected, setSelected] = useState<number | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<ChessMove | null>(
    null
  );
  const [winner, setWinner] = useState<ChessOwner | "draw" | null>(null);

  const isGameOver = winner !== null;
  const currentPlayer = state.currentPlayerIndex;

  const sources = useMemo(
    () =>
      isGameOver
        ? []
        : core.playableSources(
            state.board,
            currentPlayer,
            state.castlingRights,
            state.enPassantTarget
          ),
    [state, currentPlayer, isGameOver]
  );

  const destinations = useMemo(() => {
    if (isGameOver || selected === null) return [];
    return core
      .legalMovesFrom(state.board, selected, state.castlingRights, state.enPassantTarget)
      .map((m) => m.to);
  }, [state, selected, isGameOver]);

  // Square of the king now in check (the side to move), if any.
  const checkSquare = useMemo(() => {
    if (!core.isInCheck(state.board, currentPlayer)) return null;
    return core.findKing(state.board, currentPlayer);
  }, [state, currentPlayer]);

  const commit = useCallback(
    (move: ChessMove) => {
      const next = core.applyMove(state, move);
      setState(next);
      setSelected(null);
      setPendingPromotion(null);
      const outcome = core.gameResult(next);
      if (outcome) {
        setWinner(outcome.isDraw ? "draw" : outcome.winnerIndex);
      }
    },
    [state]
  );

  const pressSquare = useCallback(
    (index: number) => {
      if (isGameOver || pendingPromotion) return;

      if (selected === null) {
        if (!sources.includes(index)) return;
        setSelected(index);
        return;
      }

      if (index === selected) {
        setSelected(null);
        return;
      }

      const moves = core.legalMovesFrom(
        state.board,
        selected,
        state.castlingRights,
        state.enPassantTarget
      );
      const dest = moves.find((m) => m.to === index);
      if (dest) {
        if (dest.promotion) {
          setPendingPromotion({ from: selected, to: index });
          setSelected(null);
          return;
        }
        commit(dest);
        return;
      }

      if (sources.includes(index)) {
        setSelected(index);
        return;
      }

      setSelected(null);
    },
    [state, selected, sources, isGameOver, pendingPromotion, commit]
  );

  const pickPromotion = useCallback(
    (type: ChessPieceType) => {
      if (!pendingPromotion) return;
      commit({ ...pendingPromotion, promotion: type });
    },
    [pendingPromotion, commit]
  );

  const reset = useCallback(() => {
    setState(core.createInitialState());
    setSelected(null);
    setPendingPromotion(null);
    setWinner(null);
  }, []);

  return {
    state,
    currentPlayer,
    selected,
    pendingPromotion,
    sources,
    destinations,
    checkSquare,
    winner,
    isGameOver,
    pressSquare,
    pickPromotion,
    reset,
  };
}