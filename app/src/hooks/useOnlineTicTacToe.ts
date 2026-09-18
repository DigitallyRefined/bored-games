import { useCallback, useSyncExternalStore } from "react";

import { gameSocket } from "@/lib/websocket";
import type { CellValue, Player } from "@/hooks/useTicTacToe";
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

export interface OnlineTicTacToe {
  phase: OnlinePhase;
  roomId: string | null;
  code: string | null;
  playerIndex: number | null;
  symbol: Player | null;
  board: CellValue[];
  currentPlayerIndex: number | null;
  isMyTurn: boolean;
  winner: Player | "draw" | null;
  players: OnlinePlayer[];
  error: string | null;
  statusMessage: string | null;
  waitingCounts: { current: number; required: number } | null;
}

const EMPTY_BOARD: CellValue[] = Array(9).fill(null);

const initialState: OnlineTicTacToe = {
  phase: "idle",
  roomId: null,
  code: null,
  playerIndex: null,
  symbol: null,
  board: EMPTY_BOARD,
  currentPlayerIndex: null,
  isMyTurn: false,
  winner: null,
  players: [],
  error: null,
  statusMessage: null,
  waitingCounts: null,
};

let state: OnlineTicTacToe = initialState;
const listeners = new Set<() => void>();
let pendingAction: ClientMessage | null = null;
let errorTimer: ReturnType<typeof setTimeout> | null = null;

function publish(next: OnlineTicTacToe): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function setError(message: string | null): void {
  const hadTimer = errorTimer !== null;
  if (errorTimer) clearTimeout(errorTimer);
  errorTimer = message
    ? setTimeout(() => closeError(), 5000)
    : null;
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

function boardFromServer(gameState: unknown): CellValue[] {
  const gs = gameState as { board?: CellValue[] } | null;
  return Array.isArray(gs?.board) ? gs.board : EMPTY_BOARD;
}

function indexFromServer(gameState: unknown): number {
  const gs = gameState as { currentPlayerIndex?: number } | null;
  return typeof gs?.currentPlayerIndex === "number" ? gs.currentPlayerIndex : 0;
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
        symbol: (msg.symbol as Player) ?? null,
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
      const broadcastState = boardFromServer(msg.gameState);
      const index = indexFromServer(msg.gameState);
      publish({
        ...state,
        phase: "playing",
        roomId: msg.roomId,
        players: msg.players,
        board: broadcastState,
        currentPlayerIndex: index,
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
        isMyTurn: index === state.playerIndex,
        statusMessage: null,
      });
      break;
    }
    case "game_over": {
      if (state.roomId && msg.roomId !== state.roomId) break;
      let winner: Player | "draw" | null = null;
      if (msg.isDraw) {
        winner = "draw";
      } else if (msg.winnerIndex !== null) {
        winner = (["X", "O"] as Player[])[msg.winnerIndex] ?? null;
      }
      publish({
        ...state,
        phase: "gameOver",
        board: boardFromServer(msg.gameState),
        winner,
        statusMessage: null,
      });
      break;
    }
    case "opponent_disconnected":
      if (state.roomId && msg.roomId !== state.roomId) break;
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

function getSnapshot(): OnlineTicTacToe {
  return state;
}

export function useOnlineTicTacToe() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  const createRoom = useCallback((): void => {
    closeError();
    publish({ ...initialState });
    sendWhenAuthed({ type: "create_room", gameType: "tic-tac-toe" });
  }, []);

  const joinRoom = useCallback((code: string): void => {
    const normalized = code.trim().toLowerCase();
    if (!normalized) return;
    closeError();
    publish({ ...initialState });
    sendWhenAuthed({ type: "join_room", code: normalized });
  }, []);

  const makeMove = useCallback((cell: number): void => {
    if (!state.roomId) return;
    if (state.phase !== "playing") return;
    if (!state.isMyTurn) return;
    if (state.board[cell] !== null) return;
    gameSocket.send({
      type: "move",
      roomId: state.roomId,
      moveData: { cell },
    });
  }, []);

  const leaveRoom = useCallback((): void => {
    gameSocket.send({ type: "leave_room" });
    closeError();
    publish({ ...initialState });
  }, []);

  return {
    game: snapshot,
    createRoom,
    joinRoom,
    makeMove,
    leaveRoom,
  };
}