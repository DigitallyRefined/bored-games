import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";

import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import {
  fleetPalette,
  SHIPS,
  type ShipId,
} from "@/lib/battleships";
import type { PanelAccent } from "@/components/BattleshipPanel";

export interface ShipTrayProps {
  placedIds: ShipId[];
  selectedShip: ShipId | null;
  accent: PanelAccent;
  onSelectShip: (ship: ShipId | null) => void;
}

export function ShipTray({ placedIds, selectedShip, accent, onSelectShip }: ShipTrayProps) {
  const theme = useTheme();
  const pal = fleetPalette(accent);

  return (
    <View style={styles.tray}>
      {SHIPS.map((def) => {
        const placed = placedIds.includes(def.id);
        const selected = selectedShip === def.id;
        return (
          <Pressable
            key={def.id}
            disabled={placed}
            onPress={() => onSelectShip(selected ? null : def.id)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: selected ? pal.base : theme.borderLight,
              },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.segments}>
              {Array.from({ length: def.size }, (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.segment,
                    { backgroundColor: placed ? pal.base + "66" : pal.base },
                  ]}
                />
              ))}
            </View>
            <Text
              style={[
                styles.shipName,
                { color: placed ? theme.textSecondary : theme.text },
              ]}
            >
              {def.name}
            </Text>
            {placed && <Text style={[styles.check, { color: theme.success }]}>✓</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderWidth: 2,
    borderRadius: 6,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  segments: {
    flexDirection: "row",
    gap: 2,
  },
  segment: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  shipName: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.sm,
  },
  check: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
  },
});