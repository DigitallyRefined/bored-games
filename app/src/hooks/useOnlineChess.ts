import { useCallback, useSyncExternalStore } from "react";

import { gameSocket } from "@/lib/websocket";
import * as core from "@/lib/chess";
import type {
  CastlingRights,
  ChessBoard,
  ChessMove,
  ChessOwner,
  ChessPieceType,
} from "@/lib/chess";
import type { ClientMessage, ServerMessage } from "@/lib/protocol";

export type OnlinePhase =
  | "idle"
  | "waiting"
  | "playing"
  | "gameOver"
  | "error";

export interface OnlinePlayer {
  userId: string;
  username: string;
  playerIndex: number;
  symbol: string;
}

export interface OnlineChess {
  phase: OnlinePhase;
  roomId: string | null;
  code: string | null;
  playerIndex: number | null;
  symbol: string | null;
  board: ChessBoard;
  currentPlayerIndex: number | null;
  castlingRights: CastlingRights;
  enPassantTarget: number | null;
  lastMove: ChessMove | null;
  isMyTurn: boolean;
  winner: ChessOwner | "draw" | null;
  players: OnlinePlayer[];
  error: string | null;
  statusMessage: string | null;
  waitingCounts: { current: number; required: number } | null;
}

const EMPTY_BOARD: ChessBoard = Array.from({ length: core.CELL_COUNT }, () => null);

const initialState: OnlineChess = {
  phase: "idle",
  roomId: null,
  code: null,
  playerIndex: null,
  symbol: null,
  board: EMPTY_BOARD,
  currentPlayerIndex: null,
  castlingRights: core.createInitialCastlingRights(),
  enPassantTarget: null,
  lastMove: null,
  isMyTurn: false,
  winner: null,
  players: [],
  error: null,
  statusMessage: null,
  waitingCounts: null,
};

let state: OnlineChess = initialState;
const listeners = new Set<() => void>();
let pendingAction: ClientMessage | null = null;
let errorTimer: ReturnType<typeof setTimeout> | null = null;

function publish(next: OnlineChess): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function setError(message: string | null): void {
  const hadTimer = errorTimer !== null;
  if (errorTimer) clearTimeout(errorTimer);
  errorTimer = message ? setTimeout(() => closeError(), 5000) : null;
  if (message || hadTimer) {
    publish({ ...state, error: message });
  }
}

function closeError(): void {
  if (errorTimer) {
    clearTimeout(errorTimer);
    errorTimer = null;
  }
  publish({ ...state, error: null });
}

function boardFromServer(gameState: unknown): ChessBoard {
  const gs = gameState as { board?: ChessBoard } | null;
  return Array.isArray(gs?.board) ? gs.board : EMPTY_BOARD;
}

function indexFromServer(gameState: unknown): number {
  const gs = gameState as { currentPlayerIndex?: number } | null;
  return typeof gs?.currentPlayerIndex === "number" ? gs.currentPlayerIndex : 0;
}

function castlingFromServer(gameState: unknown): CastlingRights {
  const gs = gameState as { castlingRights?: Partial<CastlingRights> } | null;
  const rights = gs?.castlingRights;
  if (!rights) return initialState.castlingRights;
  return {
    wk: rights.wk === true,
    wq: rights.wq === true,
    bk: rights.bk === true,
    bq: rights.bq === true,
  };
}

function enPassantFromServer(gameState: unknown): number | null {
  const gs = gameState as { enPassantTarget?: number | null } | null;
  return typeof gs?.enPassantTarget === "number" ? gs.enPassantTarget : null;
}

function lastMoveFromServer(gameState: unknown): ChessMove | null {
  const gs = gameState as { lastMove?: ChessMove | null } | null;
  const move = gs?.lastMove;
  if (!move || typeof move.from !== "number" || typeof move.to !== "number") {
    return null;
  }
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion as ChessPieceType | undefined,
  };
}

function handleServerMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case "auth_ok": {
      if (gameSocket.getStatus() !== "connected") break;
      if (pendingAction) {
        gameSocket.send(pendingAction);
        pendingAction = null;
      }
      break;
    }
    case "room_created":
    case "room_joined":
      closeError();
      publish({
        ...state,
        phase: "waiting",
        roomId: msg.roomId,
        code: msg.code,
        playerIndex: msg.playerIndex,
        symbol: msg.symbol,
        statusMessage: "Waiting for opponent to join…",
      });
      break;
    case "waiting":
      publish({
        ...state,
        roomId: msg.roomId,
        code: msg.code,
        phase: "waiting",
        statusMessage: "Waiting for opponent to join…",
        waitingCounts: {
          current: msg.currentPlayerCount,
          required: msg.requiredPlayerCount,
        },
      });
      break;
    case "player_joined":
      publish({
        ...state,
        waitingCounts: {
          current: msg.currentPlayerCount,
          required: msg.requiredPlayerCount,
        },
      });
      break;
    case "game_start": {
      const index = indexFromServer(msg.gameState);
      publish({
        ...state,
        phase: "playing",
        roomId: msg.roomId,
        players: msg.players,
        board: boardFromServer(msg.gameState),
        currentPlayerIndex: index,
        castlingRights: castlingFromServer(msg.gameState),
        enPassantTarget: enPassantFromServer(msg.gameState),
        lastMove: lastMoveFromServer(msg.gameState),
        isMyTurn: index === state.playerIndex,
        statusMessage: null,
        waitingCounts: null,
      });
      break;
    }
    case "opponent_move": {
      if (state.roomId && msg.roomId !== state.roomId) break;
      const index = indexFromServer(msg.gameState);
      publish({
        ...state,
        board: boardFromServer(msg.gameState),
        currentPlayerIndex: index,
        castlingRights: castlingFromServer(msg.gameState),
        enPassantTarget: enPassantFromServer(msg.gameState),
        lastMove: lastMoveFromServer(msg.gameState),
        isMyTurn: index === state.playerIndex,
        statusMessage: null,
      });
      break;
    }
    case "game_over": {
      if (state.roomId && msg.roomId !== state.roomId) break;
      let winner: ChessOwner | "draw" | null = null;
      if (msg.isDraw) {
        winner = "draw";
      } else if (msg.winnerIndex !== null) {
        winner = msg.winnerIndex as ChessOwner;
      }
      publish({
        ...state,
        phase: "gameOver",
        board: boardFromServer(msg.gameState),
        castlingRights: castlingFromServer(msg.gameState),
        enPassantTarget: enPassantFromServer(msg.gameState),
        lastMove: lastMoveFromServer(msg.gameState),
        winner,
        statusMessage: null,
      });
      break;
    }
    case "opponent_disconnected":
      if (state.roomId !== msg.roomId) break;
      publish({
        ...state,
        phase: "error",
        error: "The opponent disconnected. The game is over.",
      });
      break;
    case "error":
      setError(msg.message);
      break;
    case "auth_fail":
      setError(msg.reason);
      break;
    default:
      break;
  }
}

gameSocket.subscribe(handleServerMessage);

function sendWhenAuthed(msg: ClientMessage): void {
  if (!gameSocket.getUserId()) {
    pendingAction = msg;
    gameSocket.connect();
    return;
  }
  gameSocket.send(msg);
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): OnlineChess {
  return state;
}

export function useOnlineChess() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  const createRoom = useCallback((): void => {
    closeError();
    publish({ ...initialState });
    sendWhenAuthed({ type: "create_room", gameType: "chess" });
  }, []);

  const joinRoom = useCallback((code: string): void => {
    const normalized = code.trim().toLowerCase();
    if (!normalized) return;
    closeError();
    publish({ ...initialState });
    sendWhenAuthed({ type: "join_room", code: normalized, gameType: "chess" });
  }, []);

  const makeMove = useCallback(
    (from: number, to: number, promotion?: ChessPieceType): void => {
      if (!state.roomId) return;
      if (state.phase !== "playing") return;
      if (!state.isMyTurn) return;
      const moveData: { from: number; to: number; promotion?: string } = { from, to };
      if (promotion) moveData.promotion = promotion;
      gameSocket.send({ type: "move", roomId: state.roomId, moveData });
    },
    []
  );

  const leaveRoom = useCallback((): void => {
    gameSocket.send({ type: "leave_room" });
    closeError();
    publish({ ...initialState });
  }, []);

  // When viewing from the opponent's side the board is mirrored so each player
  // sees their own pieces at the bottom edge.
  const toDisplayIndex = useCallback((index: number): number => {
    return state.playerIndex === 1 ? core.flipIndex(index) : index;
  }, []);

  const toAbsoluteIndex = useCallback((index: number): number => {
    return state.playerIndex === 1 ? core.flipIndex(index) : index;
  }, []);

  return {
    game: snapshot,
    createRoom,
    joinRoom,
    makeMove,
    leaveRoom,
    toDisplayIndex,
    toAbsoluteIndex,
  };
}