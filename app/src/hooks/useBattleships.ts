import { useCallback, useState } from "react";

import * as core from "@/lib/battleships";
import type { Fleet, Orientation } from "@/lib/battleships";

function replaceFleet(fleets: [Fleet, Fleet], index: number, fleet: Fleet): [Fleet, Fleet] {
  const next: [Fleet, Fleet] = [fleets[0], fleets[1]];
  next[index] = fleet;
  return next;
}

// Pass-and-play Battleships: the board shows only the active player's view
// (their fleet plus their radar), mirroring a foldable travel case, so the
// opponent's hidden fleet stays secret until the game is over.
export function useBattleships() {
  const [game, setGame] = useState<core.BattleshipState>(core.createInitialState);
  const [activePlayer, setActivePlayer] = useState<0 | 1>(0);
  const [winner, setWinner] = useState<0 | 1 | "draw" | null>(null);
  const [selectedShip, setSelectedShip] = useState<core.ShipId | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("h");
  const [handoff, setHandoff] = useState(false);

  const phase = game.phase;
  const isPlacing = phase === "placing";
  const fleet = game.fleets[activePlayer];

  const selectShip = useCallback((ship: core.ShipId | null) => {
    setSelectedShip(ship);
  }, []);

  const toggleOrientation = useCallback(() => {
    setOrientation((previous) => (previous === "h" ? "v" : "h"));
  }, []);

  const pressCell = useCallback(
    (cell: number) => {
      if (game.phase !== "placing") return;
      const current = game.fleets[activePlayer];

      const existing = current[cell];
      if (existing) {
        const nextFleet = core.removeShip(current, existing);
        setGame({ ...game, fleets: replaceFleet(game.fleets, activePlayer, nextFleet) });
        setSelectedShip(existing);
        return;
      }

      if (!selectedShip) return;
      const placement: core.Placement = {
        ship: selectedShip,
        row: core.rowOf(cell),
        col: core.colOf(cell),
        orientation,
      };
      if (!core.isPlacementLegal(current, placement)) return;

      const nextFleet = core.placeShip(current, placement);
      setGame({ ...game, fleets: replaceFleet(game.fleets, activePlayer, nextFleet) });
    },
    [game, activePlayer, selectedShip, orientation]
  );

  const confirmFleet = useCallback(() => {
    if (game.phase !== "placing") return;
    if (!core.isFleetComplete(game.fleets[activePlayer])) return;

    const placed: [boolean, boolean] = [game.placed[0], game.placed[1]];
    placed[activePlayer] = true;

    if (activePlayer === 0) {
      setGame({ ...game, placed });
      setActivePlayer(1);
      setSelectedShip(null);
      return;
    }

    setGame({
      phase: "playing",
      fleets: game.fleets,
      shots: game.shots,
      placed,
      currentPlayerIndex: 0,
    });
    setActivePlayer(0);
    setSelectedShip(null);
  }, [game, activePlayer]);

  const fire = useCallback(
    (cell: number) => {
      if (game.phase !== "playing") return;
      const opponent = (1 - activePlayer) as 0 | 1;
      if (game.shots[opponent][cell] !== null) return;

      const next = core.applyFire(game, cell, activePlayer);
      const outcome = core.checkOutcome(next);
      if (outcome) {
        setGame({ ...next, phase: "over" });
        setWinner(outcome.isDraw ? "draw" : (outcome.winnerIndex as 0 | 1));
        return;
      }

      // Keep the current player's view hidden, then let the next player
      // confirm the hand-off before their board is revealed.
      setGame(next);
      setHandoff(true);
    },
    [game, activePlayer]
  );

  const confirmHandoff = useCallback(() => {
    if (!handoff) return;
    setHandoff(false);
    setActivePlayer((1 - activePlayer) as 0 | 1);
  }, [handoff, activePlayer]);

  const reset = useCallback(() => {
    setGame(core.createInitialState());
    setActivePlayer(0);
    setWinner(null);
    setSelectedShip(null);
    setOrientation("h");
    setHandoff(false);
  }, []);

  return {
    game,
    phase,
    activePlayer,
    winner,
    selectedShip,
    orientation,
    isPlacing,
    fleetComplete: core.isFleetComplete(fleet),
    placedShipIds: core.placedShipIds(fleet),
    selectShip,
    toggleOrientation,
    pressCell,
    confirmFleet,
    fire,
    confirmHandoff,
    handoff,
    reset,
  };
}