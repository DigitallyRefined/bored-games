import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";

import { Fonts, FontSize } from "@/constants/theme";
import {
  BATTLE_COLORS,
  colOf,
  fleetPalette,
  rowOf,
  type Orientation,
  type ShipId,
  type ShotCell,
} from "@/lib/battleships";

const COLUMN_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export type PanelAccent = "red" | "blue";

export interface PanelPlacing {
  validCells: Set<number>;
  invalidCells: Set<number>;
}

export interface BattleshipPanelProps {
  title: string;
  ships: (ShipId | null)[] | null;
  shots: ShotCell[];
  onCellPress?: (cell: number) => void;
  disabled?: boolean;
  /** Cells revealed as a sunk ship (painted in the fleet colour). */
  highlight?: Set<number> | null;
  accent?: PanelAccent;
  placing?: PanelPlacing;
}

type CellContentProps = Omit<BattleshipPanelProps, "title"> & { index: number };

function CellContent({
  index,
  ships,
  shots,
  highlight,
  accent,
  placing,
  onCellPress,
  disabled,
}: CellContentProps) {
  const ship = ships?.[index] ?? null;
  const shot = shots[index];
  const revealed = highlight?.has(index) ?? false;
  const isValid = placing?.validCells.has(index) ?? false;
  const isInvalid = placing?.invalidCells.has(index) ?? false;
  const showShip = ship !== null || revealed;
  const alt = (rowOf(index) + colOf(index)) % 2 === 1;
  const pal = fleetPalette(accent ?? "red");

  return (
    <Pressable
      onPress={() => onCellPress?.(index)}
      disabled={disabled || !onCellPress}
      style={styles.cell}
    >
      <View
        style={[
          styles.cellFill,
          { backgroundColor: alt ? BATTLE_COLORS.oceanLight : BATTLE_COLORS.oceanDark },
        ]}
      >
        {showShip && (
          <View
            style={[
              styles.shipCell,
              { backgroundColor: pal.base, borderColor: pal.dark },
            ]}
          >
            <View style={[styles.shipBump, { backgroundColor: pal.light }]} />
          </View>
        )}
        {isValid && <View style={styles.validOverlay} />}
        {isInvalid && <View style={styles.invalidOverlay} />}
        {shot === "miss" && (
          <View
            style={[
              styles.missDot,
              { backgroundColor: BATTLE_COLORS.miss, borderColor: BATTLE_COLORS.missRim },
            ]}
          />
        )}
        {shot === "hit" && (
          <View style={styles.hitWrap}>
            {showShip && <View style={styles.hitSunkWash} />}
            <Text style={styles.hitMark}>✕</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function BattleshipPanel({
  title,
  ships,
  shots,
  onCellPress,
  disabled = false,
  highlight = null,
  accent = "red",
  placing,
}: BattleshipPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      <View style={styles.contentRow}>
        <View style={styles.numberColumn}>
          {Array.from({ length: 10 }, (_, row) => (
            <Text key={row} style={styles.numberLabel}>
              {row + 1}
            </Text>
          ))}
        </View>
        <View style={styles.gridColumn}>
          <View style={[styles.grid, disabled && styles.gridDimmed]}>
            {Array.from({ length: 100 }, (_, index) => (
              <CellContent
                key={index}
                index={index}
                ships={ships}
                shots={shots}
                highlight={highlight}
                accent={accent}
                placing={placing}
                onCellPress={onCellPress}
                disabled={disabled}
              />
            ))}
          </View>
        </View>
      </View>
      <View style={styles.lettersRow}>
        <View style={styles.numberSpacer} />
        <View style={styles.lettersColumn}>
          {COLUMN_LETTERS.map((letter) => (
            <Text key={letter} style={styles.letterLabel}>
              {letter}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const ABSOLUTE_FILL = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
} as const;

const styles = StyleSheet.create({
  panel: {
    width: "100%",
  },
  panelTitle: {
    fontFamily: Fonts.title,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * 1.1,
    color: "#EAF3F8",
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  numberColumn: {
    width: 16,
    justifyContent: "space-between",
    paddingRight: 2,
  },
  numberLabel: {
    flex: 1,
    textAlign: "right",
    fontFamily: Fonts.hand,
    fontSize: 9,
    color: "#D9E7F0",
    lineHeight: 11,
  },
  gridColumn: {
    flex: 1,
  },
  grid: {
    aspectRatio: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 4,
    overflow: "hidden",
  },
  gridDimmed: {
    opacity: 0.35,
  },
  cell: {
    width: "10%",
    height: "10%",
    alignItems: "center",
    justifyContent: "center",
  },
  cellFill: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 0.5,
    borderColor: BATTLE_COLORS.oceanLine,
  },
  shipCell: {
    width: "86%",
    height: "86%",
    borderRadius: 3,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  shipBump: {
    width: "36%",
    height: "36%",
    borderRadius: 999,
    opacity: 0.85,
  },
  validOverlay: {
    ...ABSOLUTE_FILL,
    backgroundColor: BATTLE_COLORS.shipBlue.light,
    opacity: 0.45,
  },
  invalidOverlay: {
    ...ABSOLUTE_FILL,
    backgroundColor: BATTLE_COLORS.hit,
    opacity: 0.35,
  },
  missDot: {
    width: "40%",
    height: "40%",
    borderRadius: 999,
    borderWidth: 1,
    position: "absolute",
    zIndex: 5,
  },
  hitWrap: {
    ...ABSOLUTE_FILL,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6,
  },
  hitSunkWash: {
    ...ABSOLUTE_FILL,
    backgroundColor: BATTLE_COLORS.hitPale,
  },
  hitMark: {
    fontFamily: Fonts.title,
    fontSize: 15,
    lineHeight: 16,
    color: BATTLE_COLORS.hit,
    fontWeight: "700",
  },
  lettersRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  numberSpacer: {
    width: 16,
  },
  lettersColumn: {
    flex: 1,
    flexDirection: "row",
  },
  letterLabel: {
    width: "10%",
    textAlign: "center",
    fontFamily: Fonts.hand,
    fontSize: 9,
    color: "#D9E7F0",
    lineHeight: 11,
  },
});

export type { Orientation };