import React from "react";
import { Text, View, StyleSheet } from "react-native";

import { Fonts, FontSize } from "@/constants/theme";
import { BATTLE_COLORS } from "@/lib/battleships";
import {
  BattleshipPanel,
  type BattleshipPanelProps,
} from "@/components/BattleshipPanel";

export interface BattleshipCaseProps {
  panels: BattleshipPanelProps[];
  logo?: string;
}

// The foldable travel-case frame: a navy clamshell that holds one or two
// ocean grids, with a hinge between them like the classic plastic sets.
export function BattleshipCase({ panels, logo = "BATTLESHIPS" }: BattleshipCaseProps) {
  return (
    <View style={styles.case}>
      <View style={styles.logoRow}>
        <View style={styles.logoDot} />
        <Text style={styles.logoText}>{logo}</Text>
        <View style={styles.logoDot} />
      </View>
      {panels.map((panel, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <View style={styles.spine}>
              <View style={styles.spineLine} />
              <View style={styles.spineDot} />
              <View style={styles.spineLine} />
            </View>
          )}
          <BattleshipPanel {...panel} />
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  case: {
    width: "100%",
    backgroundColor: BATTLE_COLORS.frame,
    borderWidth: 3,
    borderColor: BATTLE_COLORS.frameLight,
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 6,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BATTLE_COLORS.accent,
  },
  logoText: {
    fontFamily: Fonts.title,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.1,
    color: "#EAF3F8",
    letterSpacing: 2,
  },
  spine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
  },
  spineLine: {
    flex: 1,
    height: 2,
    backgroundColor: BATTLE_COLORS.spine,
  },
  spineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BATTLE_COLORS.accent,
  },
});