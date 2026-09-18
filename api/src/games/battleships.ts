import type { GameEngine, GameOverResult } from "./types";
import { createSetupGame, type GameMaterial } from "./setup-game";
import {
  applyFire,
  applyPlacement,
  checkOutcome,
  createInitialState,
  toPublicState,
  validatePlacements,
  type BattleshipState,
  type Placement,
  type ShipId,
  SHIPS,
} from "@shared/games/battleships";

export type { BattleshipState } from "@shared/games/battleships";

export type BattleshipMoveData =
  | { type: "place"; placements: Placement[] }
  | { type: "fire"; cell: number };

function shipMaterials(playerCount: number): GameMaterial[] {
  return SHIPS.map((ship) => ({ id: ship.id, label: ship.name }));
}

function validateSetup(state: BattleshipState, action: unknown, playerIndex: number): boolean {
  if (state.phase !== "placing") return false;
  if (state.placed[playerIndex]) return false;
  const data = action as BattleshipMoveData | null;
  if (!data || data.type !== "place") return false;
  return validatePlacements(data.placements);
}

function applySetup(state: BattleshipState, action: unknown, playerIndex: number): BattleshipState {
  const data = action as BattleshipMoveData;
  if (data.type !== "place") return state;
  return applyPlacement(state, data.placements, playerIndex);
}

function validatePlay(state: BattleshipState, action: unknown, playerIndex: number): boolean {
  if (state.currentPlayerIndex !== playerIndex) return false;
  const data = action as BattleshipMoveData | null;
  if (!data || data.type !== "fire") return false;
  const { cell } = data;
  if (typeof cell !== "number" || !Number.isInteger(cell)) return false;
  if (cell < 0 || cell >= 100) return false;
  const opponent = 1 - playerIndex;
  return state.shots[opponent][cell] === null;
}

function applyPlay(
  state: BattleshipState,
  action: unknown,
  playerIndex: number,
  playerCount: number
): BattleshipState {
  const data = action as BattleshipMoveData;
  if (data.type !== "fire") return state;
  return applyFire(state, data.cell, playerIndex);
}

export const battleshipsEngine: GameEngine = createSetupGame<BattleshipState, BattleshipMoveData>({
  gameId: "battleships",
  playerCount: { min: 2, max: 2 },
  createMaterials: shipMaterials,
  createInitialState(playerCount: number, materials: GameMaterial[]): BattleshipState {
    return createInitialState();
  },
  symbolFor(playerIndex: number): string {
    return playerIndex === 0 ? "Red" : "Blue";
  },
  isArranging(state: BattleshipState): boolean {
    return state.phase === "placing";
  },
  validateSetup,
  applySetup,
  validatePlay,
  applyPlay,
  checkGameOver(state: BattleshipState): GameOverResult | null {
    return checkOutcome(state);
  },
  publicState(state: BattleshipState): unknown {
    return toPublicState(state);
  },
});

export type { ShipId };