// Pure Battleships rules shared between the API engine (api/src/games/battleships.ts)
// and the app (app/src/lib/battleships.ts). No server or UI dependencies.
//
// Classic rules: two 10x10 grids, a standard five-ship fleet (Carrier 5,
// Battleship 4, Cruiser 3, Submarine 3, Destroyer 2), ships placed in straight
// lines that never touch (not even diagonally). Players take turns firing a
// single shot per turn; the first to sink the entire enemy fleet wins.
//
// During the "placing" phase each player privately arranges their own fleet,
// then the game switches to alternating fire during the "playing" phase.
// State is oriented purely by player index (no board mirroring is needed):
// player 0 = "Red", player 1 = "Blue".

export const GRID_SIZE = 10;
export const GRID_CELLS = GRID_SIZE * GRID_SIZE;

export type ShipId =
  | "carrier"
  | "battleship"
  | "cruiser"
  | "submarine"
  | "destroyer";

export interface ShipDef {
  id: ShipId;
  name: string;
  size: number;
}

export const SHIPS: ShipDef[] = [
  { id: "carrier", name: "Carrier", size: 5 },
  { id: "battleship", name: "Battleship", size: 4 },
  { id: "cruiser", name: "Cruiser", size: 3 },
  { id: "submarine", name: "Submarine", size: 3 },
  { id: "destroyer", name: "Destroyer", size: 2 },
];

export const SHIP_IDS: readonly ShipId[] = SHIPS.map((ship) => ship.id);

export function shipDef(id: ShipId): ShipDef {
  const def = SHIPS.find((ship) => ship.id === id);
  if (!def) throw new Error(`Unknown ship: ${id}`);
  return def;
}

export function rowOf(index: number): number {
  return Math.floor(index / GRID_SIZE);
}

export function colOf(index: number): number {
  return index % GRID_SIZE;
}

export function idxOf(row: number, col: number): number {
  return row * GRID_SIZE + col;
}

export type Orientation = "h" | "v";

export interface Placement {
  ship: ShipId;
  row: number;
  col: number;
  orientation: Orientation;
}

export type Fleet = (ShipId | null)[];
export type ShotCell = "hit" | "miss" | null;
export type ShotGrid = ShotCell[];

export type BattleshipPhase = "placing" | "playing" | "over";

export interface BattleshipState {
  phase: BattleshipPhase;
  fleets: [Fleet, Fleet];
  shots: [ShotGrid, ShotGrid];
  placed: [boolean, boolean];
  currentPlayerIndex: number;
}

export function createEmptyFleet(): Fleet {
  return Array<ShipId | null>(GRID_CELLS).fill(null);
}

export function createEmptyShots(): ShotGrid {
  return Array<ShotCell>(GRID_CELLS).fill(null);
}

export function createInitialState(): BattleshipState {
  return {
    phase: "placing",
    fleets: [createEmptyFleet(), createEmptyFleet()],
    shots: [createEmptyShots(), createEmptyShots()],
    placed: [false, false],
    currentPlayerIndex: 0,
  };
}

// ---------------------------------------------------------------------------
// Placement helpers
// ---------------------------------------------------------------------------

export function placementCells(placement: Placement): number[] {
  const def = shipDef(placement.ship);
  const cells: number[] = [];
  for (let k = 0; k < def.size; k++) {
    const row = placement.orientation === "v" ? placement.row + k : placement.row;
    const col = placement.orientation === "h" ? placement.col + k : placement.col;
    cells.push(idxOf(row, col));
  }
  return cells;
}

// Neighbouring cells (including diagonally) around a set of ship cells, used
// to enforce the classic "ships may not touch" rule.
export function neighborsOf(cells: number[]): number[] {
  const set = new Set<number>();
  for (const cell of cells) {
    const r = rowOf(cell);
    const c = colOf(cell);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
        set.add(idxOf(nr, nc));
      }
    }
  }
  for (const cell of cells) set.delete(cell);
  return Array.from(set);
}

export function isPlacementLegal(fleet: Fleet, placement: Placement): boolean {
  const def = shipDef(placement.ship);
  if (placement.row < 0 || placement.col < 0) return false;
  if (placement.row >= GRID_SIZE || placement.col >= GRID_SIZE) return false;
  if (placement.orientation === "v" && placement.row + def.size > GRID_SIZE) return false;
  if (placement.orientation === "h" && placement.col + def.size > GRID_SIZE) return false;

  // A ship cannot be placed twice.
  for (let i = 0; i < GRID_CELLS; i++) {
    if (fleet[i] === placement.ship) return false;
  }

  const cells = placementCells(placement);
  for (const cell of cells) {
    if (cell < 0 || cell >= GRID_CELLS) return false;
    if (fleet[cell] !== null) return false;
  }

  // Classic rule: ships may not touch, even diagonally.
  return neighborsOf(cells).every((cell) => fleet[cell] === null);
}

export function placeShip(fleet: Fleet, placement: Placement): Fleet {
  const next = fleet.slice();
  for (const cell of placementCells(placement)) {
    next[cell] = placement.ship;
  }
  return next;
}

export function removeShip(fleet: Fleet, ship: ShipId): Fleet {
  return fleet.map((cell) => (cell === ship ? null : cell));
}

export function placedShipIds(fleet: Fleet): ShipId[] {
  return SHIP_IDS.filter((id) => fleet.includes(id));
}

export function isFleetComplete(fleet: Fleet): boolean {
  return SHIP_IDS.every((id) => fleet.includes(id));
}

export function placementsToFleet(placements: Placement[]): Fleet {
  let fleet = createEmptyFleet();
  for (const placement of placements) {
    fleet = placeShip(fleet, placement);
  }
  return fleet;
}

export function placementsFromFleet(fleet: Fleet): Placement[] {
  const placements: Placement[] = [];
  for (const id of SHIP_IDS) {
    const cells: number[] = [];
    for (let i = 0; i < GRID_CELLS; i++) {
      if (fleet[i] === id) cells.push(i);
    }
    if (cells.length === 0) continue;
    const rows = cells.map(rowOf);
    const cols = cells.map(colOf);
    const rowsUnique = new Set(rows).size === 1;
    if (rowsUnique) {
      placements.push({ ship: id, row: rows[0], col: Math.min(...cols), orientation: "h" });
    } else {
      placements.push({ ship: id, row: Math.min(...rows), col: cols[0], orientation: "v" });
    }
  }
  return placements;
}

// Server-side validation of a complete fleet submission. Accepts unknown data
// and returns false for anything malformed.
export function validatePlacements(placements: unknown): boolean {
  if (!Array.isArray(placements) || placements.length !== SHIPS.length) return false;

  const seen = new Set<ShipId>();
  let fleet = createEmptyFleet();

  for (const item of placements) {
    if (!item || typeof item !== "object") return false;
    const { ship, row, col, orientation } = item as Placement;

    if (!SHIP_IDS.includes(ship)) return false;
    if (seen.has(ship)) return false;
    if (typeof row !== "number" || !Number.isInteger(row)) return false;
    if (typeof col !== "number" || !Number.isInteger(col)) return false;
    if (orientation !== "h" && orientation !== "v") return false;

    const placement: Placement = { ship, row, col, orientation };
    if (!isPlacementLegal(fleet, placement)) return false;

    seen.add(ship);
    fleet = placeShip(fleet, placement);
  }

  return seen.size === SHIPS.length;
}

// ---------------------------------------------------------------------------
// Move application
// ---------------------------------------------------------------------------

export function applyPlacement(
  state: BattleshipState,
  placements: Placement[],
  playerIndex: number
): BattleshipState {
  const fleets: [Fleet, Fleet] = [state.fleets[0].slice(), state.fleets[1].slice()];
  fleets[playerIndex] = placementsToFleet(placements);

  const placed: [boolean, boolean] = [state.placed[0], state.placed[1]];
  placed[playerIndex] = true;

  if (state.phase === "placing" && placed[0] && placed[1]) {
    return {
      phase: "playing",
      fleets,
      shots: state.shots,
      placed,
      currentPlayerIndex: 0,
    };
  }

  return { ...state, fleets, placed, currentPlayerIndex: state.currentPlayerIndex };
}

export function applyFire(state: BattleshipState, cell: number, playerIndex: number): BattleshipState {
  const opponent = 1 - playerIndex;
  const shots: [ShotGrid, ShotGrid] = [state.shots[0].slice(), state.shots[1].slice()];
  shots[opponent][cell] = state.fleets[opponent][cell] !== null ? "hit" : "miss";
  return { ...state, shots, currentPlayerIndex: opponent };
}

// ---------------------------------------------------------------------------
// Outcome helpers
// ---------------------------------------------------------------------------

export interface ShipStatus {
  id: ShipId;
  name: string;
  size: number;
  hits: number;
  sunk: boolean;
  cells?: number[];
}

export function fleetStatus(fleet: Fleet, shots: ShotGrid): ShipStatus[] {
  return SHIPS.map((def) => {
    const cells: number[] = [];
    for (let i = 0; i < GRID_CELLS; i++) {
      if (fleet[i] === def.id) cells.push(i);
    }
    const hits = cells.filter((cell) => shots[cell] === "hit").length;
    const sunk = hits === def.size;
    return {
      id: def.id,
      name: def.name,
      size: def.size,
      hits,
      sunk,
      ...(sunk ? { cells } : {}),
    };
  });
}

export function allShipsSunk(fleet: Fleet, shots: ShotGrid): boolean {
  for (const def of SHIPS) {
    let sunk = true;
    for (let i = 0; i < GRID_CELLS; i++) {
      if (fleet[i] === def.id && shots[i] !== "hit") {
        sunk = false;
        break;
      }
    }
    if (!sunk) return false;
  }
  return true;
}

export interface GameOverResult {
  winnerIndex: number | null;
  isDraw: boolean;
}

export function checkOutcome(state: BattleshipState): GameOverResult | null {
  if (state.phase !== "playing") return null;
  const over0 = allShipsSunk(state.fleets[0], state.shots[0]);
  const over1 = allShipsSunk(state.fleets[1], state.shots[1]);
  if (over0 && over1) return { winnerIndex: null, isDraw: true };
  if (over0) return { winnerIndex: 1, isDraw: false };
  if (over1) return { winnerIndex: 0, isDraw: false };
  return null;
}

// ---------------------------------------------------------------------------
// Public state (fleets stay hidden until the game is over)
// ---------------------------------------------------------------------------

export interface PublicBattleshipState {
  phase: BattleshipPhase;
  placed: [boolean, boolean];
  shots: [ShotGrid, ShotGrid];
  ships: [ShipStatus[], ShipStatus[]];
  currentPlayerIndex: number;
  fleets?: [Fleet, Fleet];
}

export function toPublicState(state: BattleshipState): PublicBattleshipState {
  return {
    phase: state.phase,
    placed: state.placed,
    shots: state.shots,
    ships: [
      fleetStatus(state.fleets[0], state.shots[0]),
      fleetStatus(state.fleets[1], state.shots[1]),
    ],
    currentPlayerIndex: state.currentPlayerIndex,
    ...(state.phase === "over" ? { fleets: state.fleets } : {}),
  };
}