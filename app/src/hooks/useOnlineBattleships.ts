import { useCallback, useSyncExternalStore } from "react";

import { gameSocket } from "@/lib/websocket";
import * as core from "@/lib/battleships";
import type { Fleet, Orientation, Placement, ShipId, ShipStatus, ShotGrid } from "@/lib/battleships";
import type { ClientMessage, ServerMessage } from "@/lib/protocol";

export type OnlinePhase =
  | "idle"
  | "waiting"
  | "placing"
  | "playing"
  | "gameOver"
  | "error";

export interface OnlinePlayer {
  userId: string;
  username: string;
  playerIndex: number;
  symbol: string;
}

export interface OnlineBattleships {
  phase: OnlinePhase;
  roomId: string | null;
  code: string | null;
  playerIndex: number | null;
  symbol: string | null;
  myFleet: Fleet;
  shots: [ShotGrid, ShotGrid];
  ships: [ShipStatus[], ShipStatus[]];
  placed: [boolean, boolean];
  serverFleets: [Fleet, Fleet] | null;
  currentPlayerIndex: number | null;
  isMyTurn: boolean;
  winner: number | "draw" | null;
  players: OnlinePlayer[];
  error: string | null;
  statusMessage: string | null;
  waitingCounts: { current: number; required: number } | null;
}

const EMPTY_FLEET = core.createEmptyFleet();
const EMPTY_SHOTS = core.createEmptyShots();
const EMPTY_STATUS: ShipStatus[] = core.SHIPS.map((def) => ({
  id: def.id,
  name: def.name,
  size: def.size,
  hits: 0,
  sunk: false,
}));

const initialState: OnlineBattleships = {
  phase: "idle",
  roomId: null,
  code: null,
  playerIndex: null,
  symbol: null,
  myFleet: EMPTY_FLEET,
  shots: [EMPTY_SHOTS, EMPTY_SHOTS],
  ships: [EMPTY_STATUS.slice(), EMPTY_STATUS.slice()],
  placed: [false, false],
  serverFleets: null,
  currentPlayerIndex: null,
  isMyTurn: false,
  winner: null,
  players: [],
  error: null,
  statusMessage: null,
  waitingCounts: null,
};

let state: OnlineBattleships = initialState;
const listeners = new Set<() => void>();
let pendingAction: ClientMessage | null = null;
let errorTimer: ReturnType<typeof setTimeout> | null = null;

function publish(next: OnlineBattleships): void {
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

interface PublicGameState {
  phase?: string;
  placed?: boolean[];
  shots?: [ShotGrid, ShotGrid];
  ships?: [ShipStatus[], ShipStatus[]];
  currentPlayerIndex?: number;
  fleets?: [Fleet, Fleet] | null;
}

function parsePublic(gameState: unknown): PublicGameState {
  const gs = gameState as PublicGameState | null;
  return gs ?? {};
}

function phaseFromServer(gameState: unknown, fallback: OnlinePhase): OnlinePhase {
  const phase = parsePublic(gameState).phase;
  if (phase === "placing") return "placing";
  if (phase === "playing") return "playing";
  if (phase === "over") return "gameOver";
  return fallback;
}

function shotsFromServer(gameState: unknown, fallback = [EMPTY_SHOTS, EMPTY_SHOTS]): [ShotGrid, ShotGrid] {
  const shots = parsePublic(gameState).shots;
  if (Array.isArray(shots) && Array.isArray(shots[0])) return shots;
  return [fallback[0], fallback[1]];
}

function shipsFromServer(gameState: unknown): [ShipStatus[], ShipStatus[]] {
  const ships = parsePublic(gameState).ships;
  if (Array.isArray(ships) && Array.isArray(ships[0])) return ships;
  return [EMPTY_STATUS.slice(), EMPTY_STATUS.slice()];
}

function placedFromServer(gameState: unknown, fallback: [boolean, boolean]): [boolean, boolean] {
  const placed = parsePublic(gameState).placed;
  if (Array.isArray(placed) && typeof placed[0] === "boolean") {
    return [placed[0] ?? false, placed[1] ?? false];
  }
  return [fallback[0], fallback[1]];
}

function fleetsFromServer(
  gameState: unknown,
  fallback: [Fleet, Fleet] | null
): [Fleet, Fleet] | null {
  const fleets = parsePublic(gameState).fleets;
  if (fleets && Array.isArray(fleets[0]) && Array.isArray(fleets[1])) return fleets;
  return fallback;
}

function indexFromServer(gameState: unknown, fallback: number | null): number | null {
  const index = parsePublic(gameState).currentPlayerIndex;
  return typeof index === "number" ? index : fallback;
}

function withPlaced(placed: [boolean, boolean], index: number): [boolean, boolean] {
  const next: [boolean, boolean] = [placed[0], placed[1]];
  next[index] = true;
  return next;
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
      const phase = phaseFromServer(msg.gameState, "placing");
      const index = indexFromServer(msg.gameState, null);
      publish({
        ...state,
        phase,
        roomId: msg.roomId,
        players: msg.players,
        shots: shotsFromServer(msg.gameState),
        ships: shipsFromServer(msg.gameState),
        placed: placedFromServer(msg.gameState, state.placed),
        serverFleets: fleetsFromServer(msg.gameState, null),
        currentPlayerIndex: index,
        isMyTurn: phase === "playing" && index === state.playerIndex,
        statusMessage: null,
        waitingCounts: null,
      });
      break;
    }
    case "opponent_move": {
      if (state.roomId && msg.roomId !== state.roomId) break;
      const phase = phaseFromServer(msg.gameState, state.phase);
      const index = indexFromServer(msg.gameState, state.currentPlayerIndex);
      publish({
        ...state,
        phase,
        shots: shotsFromServer(msg.gameState),
        ships: shipsFromServer(msg.gameState),
        placed: placedFromServer(msg.gameState, state.placed),
        serverFleets: fleetsFromServer(msg.gameState, state.serverFleets),
        currentPlayerIndex: index,
        isMyTurn: phase === "playing" && index === state.playerIndex,
        statusMessage: null,
      });
      break;
    }
    case "game_over": {
      if (state.roomId && msg.roomId !== state.roomId) break;
      let winner: number | "draw" | null = null;
      if (msg.isDraw) {
        winner = "draw";
      } else if (msg.winnerIndex !== null) {
        winner = msg.winnerIndex;
      }
      publish({
        ...state,
        phase: "gameOver",
        shots: shotsFromServer(msg.gameState),
        ships: shipsFromServer(msg.gameState),
        serverFleets: fleetsFromServer(msg.gameState, null),
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

function getSnapshot(): OnlineBattleships {
  return state;
}

export function useOnlineBattleships() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  const createRoom = useCallback((): void => {
    closeError();
    publish({ ...initialState });
    sendWhenAuthed({ type: "create_room", gameType: "battleships" });
  }, []);

  const joinRoom = useCallback((code: string): void => {
    const normalized = code.trim().toLowerCase();
    if (!normalized) return;
    closeError();
    publish({ ...initialState });
    sendWhenAuthed({ type: "join_room", code: normalized, gameType: "battleships" });
  }, []);

  // Place or remove a ship while arranging. Returns true when the grid changed.
  const placeOnGrid = useCallback(
    (cell: number, ship: ShipId | null, orientation: Orientation): boolean => {
      if (state.phase !== "placing") return false;
      const me = state.playerIndex;
      if (me === null || state.placed[me]) return false;

      const fleet = state.myFleet;
      const existing = fleet[cell];
      if (existing) {
        publish({ ...state, myFleet: core.removeShip(fleet, existing) });
        return true;
      }
      if (!ship) return false;

      const placement: Placement = {
        ship,
        row: core.rowOf(cell),
        col: core.colOf(cell),
        orientation,
      };
      if (!core.isPlacementLegal(fleet, placement)) return false;
      publish({ ...state, myFleet: core.placeShip(fleet, placement) });
      return true;
    },
    []
  );

  const deployFleet = useCallback(
    (placements: Placement[]): void => {
      const me = state.playerIndex;
      const roomId = state.roomId;
      if (me === null) return;
      if (!roomId) return;
      if (state.phase !== "placing") return;
      if (state.placed[me]) return;
      if (!core.validatePlacements(placements)) return;

      gameSocket.send({
        type: "move",
        roomId,
        moveData: { type: "place", placements },
      });
      publish({
        ...state,
        myFleet: core.placementsToFleet(placements),
        placed: withPlaced(state.placed, me),
      });
    },
    []
  );

  const fire = useCallback((cell: number): void => {
    const me = state.playerIndex;
    const roomId = state.roomId;
    if (me === null) return;
    if (!roomId) return;
    if (state.phase !== "playing") return;
    if (state.currentPlayerIndex !== me) return;
    const opponent = 1 - me;
    if (state.shots[opponent][cell] !== null) return;
    gameSocket.send({
      type: "move",
      roomId,
      moveData: { type: "fire", cell },
    });
  }, []);

  const place = useCallback((cell: number, ship: ShipId | null, orientation: Orientation) => {
    return placeOnGrid(cell, ship, orientation);
  }, [placeOnGrid]);

  const leaveRoom = useCallback((): void => {
    gameSocket.send({ type: "leave_room" });
    closeError();
    publish({ ...initialState });
  }, []);

  return {
    game: snapshot,
    createRoom,
    joinRoom,
    place,
    deployFleet,
    fire,
    leaveRoom,
  };
}