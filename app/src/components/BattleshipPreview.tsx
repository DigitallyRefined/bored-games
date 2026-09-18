import { View, StyleSheet } from "react-native";

import { BATTLE_COLORS } from "@/lib/battleships";

export function BattleshipPreview() {
  return (
    <View style={styles.frame}>
      <View style={styles.grid}>
        {Array.from({ length: 100 }, (_, index) => {
          const row = Math.floor(index / 10);
          const col = index % 10;
          const alt = (row + col) % 2 === 1;
          const red = row === 2 && col >= 1 && col <= 3;
          const blue = row === 6 && col >= 6 && col <= 7;
          const hit = row === 2 && col === 2;
          const miss = row === 5 && col === 5;
          return (
            <View
              key={index}
              style={[
                styles.cell,
                { backgroundColor: alt ? BATTLE_COLORS.oceanLight : BATTLE_COLORS.oceanDark },
              ]}
            >
              {red && <View style={[styles.ship, { backgroundColor: BATTLE_COLORS.shipRed.base }]} />}
              {blue && <View style={[styles.ship, { backgroundColor: BATTLE_COLORS.shipBlue.base }]} />}
              {hit && <View style={styles.hitDot} />}
              {miss && <View style={styles.missDot} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 80,
    height: 80,
    padding: 3,
    borderRadius: 6,
    backgroundColor: BATTLE_COLORS.frame,
    borderWidth: 2,
    borderColor: BATTLE_COLORS.frameLight,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 3,
    overflow: "hidden",
  },
  cell: {
    width: "10%",
    height: "10%",
    alignItems: "center",
    justifyContent: "center",
  },
  ship: {
    width: "70%",
    height: "70%",
    borderRadius: 2,
  },
  hitDot: {
    position: "absolute",
    width: "60%",
    height: "60%",
    borderRadius: 2,
    backgroundColor: BATTLE_COLORS.hit,
  },
  missDot: {
    position: "absolute",
    width: "50%",
    height: "50%",
    borderRadius: 999,
    backgroundColor: BATTLE_COLORS.miss,
  },
});