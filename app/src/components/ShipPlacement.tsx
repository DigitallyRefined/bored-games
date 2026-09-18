import React, { useMemo } from "react";
import { Text, View, StyleSheet } from "react-native";

import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { SketchyButton } from "@/components/SketchyButton";
import { BattleshipCase } from "@/components/BattleshipCase";
import { ShipTray } from "@/components/ShipTray";
import type { PanelAccent } from "@/components/BattleshipPanel";
import * as core from "@/lib/battleships";
import type { Fleet, Orientation, ShipId } from "@/lib/battleships";

const NO_SHOTS = core.createEmptyShots();

export interface ShipPlacementProps {
  fleet: Fleet;
  selectedShip: ShipId | null;
  orientation: Orientation;
  accent: PanelAccent;
  onPressCell: (cell: number) => void;
  onSelectShip: (ship: ShipId | null) => void;
  onToggleOrientation: () => void;
  onDeploy?: () => void;
  deployLabel?: string;
  /** Locked because the fleet was already deployed (online waiting). */
  deployed?: boolean;
}

export function ShipPlacement({
  fleet,
  selectedShip,
  orientation,
  accent,
  onPressCell,
  onSelectShip,
  onToggleOrientation,
  onDeploy,
  deployLabel = "Deploy the fleet!",
  deployed = false,
}: ShipPlacementProps) {
  const theme = useTheme();
  const ready = core.isFleetComplete(fleet);

  const { validCells, invalidCells } = useMemo(() => {
    const valid = new Set<number>();
    const invalid = new Set<number>();
    if (selectedShip) {
      const def = core.shipDef(selectedShip);
      for (let row = 0; row < core.GRID_SIZE; row++) {
        for (let col = 0; col < core.GRID_SIZE; col++) {
          const placement: core.Placement = { ship: selectedShip, row, col, orientation };
          const fits =
            row >= 0 &&
            col >= 0 &&
            row < core.GRID_SIZE &&
            col < core.GRID_SIZE &&
            (orientation === "h"
              ? col + def.size <= core.GRID_SIZE
              : row + def.size <= core.GRID_SIZE);
          if (!fits) continue;
          if (core.isPlacementLegal(fleet, placement)) {
            valid.add(core.idxOf(row, col));
          } else {
            invalid.add(core.idxOf(row, col));
          }
        }
      }
    }
    return { validCells: valid, invalidCells: invalid };
  }, [fleet, selectedShip, orientation]);

  const locked = deployed;

  return (
    <View style={styles.container}>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        Tap a ship below, then tap the sea to drop it. Rotate flips it around.
      </Text>

      <View style={styles.caseWrapper}>
        <BattleshipCase
          panels={[
            {
              title: "Your ocean",
              ships: fleet,
              shots: NO_SHOTS,
              accent,
              onCellPress: locked ? undefined : onPressCell,
              disabled: locked,
              placing: { validCells, invalidCells },
            },
          ]}
        />
      </View>

      <View style={styles.trayWrapper}>
        <ShipTray
          placedIds={core.placedShipIds(fleet)}
          selectedShip={locked ? null : selectedShip}
          accent={accent}
          onSelectShip={locked ? () => {} : onSelectShip}
        />
      </View>

      <View style={styles.actionRow}>
        <SketchyButton
          title={orientation === "h" ? "Rotate ↻" : "Rotate ↺"}
          variant="outline"
          onPress={onToggleOrientation}
          style={styles.rotateButton}
        />
        {ready && onDeploy && !locked && (
          <SketchyButton
            title={deployLabel}
            variant="primary"
            onPress={onDeploy}
            style={styles.deployButton}
          />
        )}
      </View>

      {locked && (
        <Text style={[styles.lockedText, { color: theme.textSecondary }]}>
          Waiting for the opponent to deploy their fleet…
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  hint: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.4,
    textAlign: "center",
  },
  caseWrapper: {
    alignItems: "center",
  },
  trayWrapper: {
    marginTop: Spacing.one,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.four,
    flexWrap: "wrap",
  },
  rotateButton: {
    minWidth: 120,
  },
  deployButton: {
    minWidth: 140,
  },
  lockedText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    textAlign: "center",
  },
});