// Generic engine for turn-based games that open with a private "settling"
// phase before ordinary play: Battleships (place a fleet), card games (draw a
// hand from a deck), dominoes (draw and arrange a sequence of tiles) and so on.
//
// A game plugs in by providing a `SetupGameDefinition` — its player count, a
// factory for the pieces a fresh game starts with (a shuffled deck, a domino
// set, the ship catalogue…), and pure validate/apply/outcome functions for the
// settling and playing phases. `createSetupGame` adapts that definition onto
// the shared `GameEngine` interface used by the room handlers, so every
// settle-then-play game slots into the registry with the same plumbing.
//
// While a game is settling, ALL players may act (there is no "turn"); once the
// definition reports the arrangement is done the engine routes actions through
// the play-phase rule functions with normal alternating turns.

import type { GameEngine, GameOverResult } from "./types";

/** A single piece of game material: a card, a domino tile, a ship of a fleet… */
export interface GameMaterial {
  id: string;
  label: string;
}

/** Builds the materials a brand-new game starts with. */
export type MaterialFactory = (playerCount: number) => GameMaterial[];

const CARD_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const CARD_SUITS = ["♠", "♥", "♦", "♣"];

/** A standard 52-card French deck as game materials. */
export function createCardDeck(): GameMaterial[] {
  const deck: GameMaterial[] = [];
  for (const suit of CARD_SUITS) {
    for (const rank of CARD_RANKS) {
      deck.push({ id: `${rank}${suit}`, label: `${rank}${suit}` });
    }
  }
  return deck;
}

/** A standard double-six domino set (0-0 through 6-6) as game materials. */
export function createDominoSet(): GameMaterial[] {
  const tiles: GameMaterial[] = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      tiles.push({ id: `${a}${b}`, label: `${a}|${b}` });
    }
  }
  return tiles;
}

/** Fisher–Yates shuffle over a copy of the given materials. */
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }
  return copy;
}

export interface SetupGameDefinition<TState, TAction> {
  /** Identifier used by the room registry (e.g. "battleships"). */
  gameId: string;
  playerCount: { min: number; max: number };
  /**
   * Loose pieces a fresh game starts on the table. Card games use
   * `createCardDeck`, dominoes use `createDominoSet`, and fleet games simply
   * yield their ship catalogue. Receives the player count so variable-width
   * decks are possible.
   */
  createMaterials?: MaterialFactory;
  /**
   * Builds the full initial state from a generic material pool. The pool can
   * be ignored entirely by games that track their own private pieces.
   */
  createInitialState(playerCount: number, materials: GameMaterial[]): TState;
  symbolFor(playerIndex: number): string;
  /** True while players are still arranging (fleet placement, hand draw…). */
  isArranging(state: TState): boolean;
  /** Settle-phase action validation. Runs for whichever player acts. */
  validateSetup(state: TState, action: TAction, playerIndex: number): boolean;
  /** Settle-phase action application. */
  applySetup(state: TState, action: TAction, playerIndex: number): TState;
  /** Play-phase action validation. Must enforce the current player's turn. */
  validatePlay(state: TState, action: TAction, playerIndex: number): boolean;
  applyPlay(state: TState, action: TAction, playerIndex: number, playerCount: number): TState;
  checkGameOver(state: TState): GameOverResult | null;
  /** Per-recipient snapshot (hide private arrangements, hands, etc.). */
  publicState(state: TState): unknown;
}

export function createSetupGame<TState, TAction>(
  definition: SetupGameDefinition<TState, TAction>
): GameEngine {
  return {
    playerCount: definition.playerCount,

    createInitialState(playerCount: number): TState {
      const materials = definition.createMaterials
        ? definition.createMaterials(playerCount)
        : [];
      return definition.createInitialState(playerCount, materials);
    },

    getPlayerSymbol(playerIndex: number): string {
      return definition.symbolFor(playerIndex);
    },

    validateMove(state: TState, moveData: unknown, playerIndex: number): boolean {
      if (definition.isArranging(state)) {
        return definition.validateSetup(state, moveData as TAction, playerIndex);
      }
      return definition.validatePlay(state, moveData as TAction, playerIndex);
    },

    applyMove(
      state: TState,
      moveData: unknown,
      playerIndex: number,
      playerCount: number
    ): TState {
      if (definition.isArranging(state)) {
        return definition.applySetup(state, moveData as TAction, playerIndex);
      }
      return definition.applyPlay(state, moveData as TAction, playerIndex, playerCount);
    },

    checkGameOver(state: TState): GameOverResult | null {
      if (definition.isArranging(state)) return null;
      return definition.checkGameOver(state);
    },

    getPublicState(state: TState): unknown {
      return definition.publicState(state);
    },
  };
}