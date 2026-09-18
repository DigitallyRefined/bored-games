import { View, StyleSheet } from "react-native";

import { BOARD_COLORS, createInitialBoard } from "@/lib/checkers";

export function CheckersPreview() {
  const board = createInitialBoard();
  const show = (row: number, col: number) =>
    (row === 0 || row === 1) && col % 2 === 1 ||
    (row === 6 || row === 7) && col % 2 === 0;

  return (
    <View style={styles.frame}>
      <View style={styles.board}>
        {Array.from({ length: 64 }, (_, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;
          const isDark = (row + col) % 2 === 1;
          const piece = board[index];

          const hasPiece =
            (piece?.owner === 0 && (row === 6 || row === 7)) ||
            (piece?.owner === 1 && (row === 0 || row === 1));

          return (
            <View
              key={index}
              style={[styles.cell, { backgroundColor: isDark ? BOARD_COLORS.dark : BOARD_COLORS.light }]}
            >
              {hasPiece || show(row, col) ? (
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        piece && piece.owner === 0
                          ? BOARD_COLORS.darkPiece.base
                          : piece && piece.owner === 1
                            ? BOARD_COLORS.lightPiece.base
                            : "transparent",
                    },
                  ]}
                />
              ) : null}
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
    backgroundColor: BOARD_COLORS.frame,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  board: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 3,
    overflow: "hidden",
  },
  cell: {
    width: "12.5%",
    height: "12.5%",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: "55%",
    height: "55%",
    borderRadius: 999,
  },
});