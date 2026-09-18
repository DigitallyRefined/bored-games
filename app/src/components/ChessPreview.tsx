import { StyleSheet, Text, View } from "react-native";

import { BOARD_COLORS, PIECE_GLYPHS, createInitialBoard } from "@/lib/chess";
import type { ChessPiece } from "@/lib/chess";

const CELL = 9.5;

function MiniPiece({ piece }: { piece: ChessPiece }) {
  return (
    <Text
      style={{
        fontSize: CELL * 0.72,
        lineHeight: CELL * 0.86,
        textAlign: "center",
        color: piece.owner === 0 ? BOARD_COLORS.lightPiece.base : BOARD_COLORS.darkPiece.base,
        fontWeight: "600",
        textShadowColor:
          piece.owner === 0
            ? BOARD_COLORS.lightPiece.outline
            : BOARD_COLORS.darkPiece.outline,
        textShadowOffset: { width: 0.4, height: 0.6 },
        textShadowRadius: 0.4,
      }}
    >
      {PIECE_GLYPHS[piece.type]}
    </Text>
  );
}

export function ChessPreview() {
  const board = createInitialBoard();

  return (
    <View style={styles.frame}>
      <View style={styles.board}>
        {Array.from({ length: 64 }, (_, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;
          const isDark = (row + col) % 2 === 1;
          const piece = board[index];
          return (
            <View
              key={index}
              style={[
                styles.cell,
                { backgroundColor: isDark ? BOARD_COLORS.dark : BOARD_COLORS.light },
              ]}
            >
              {piece && <MiniPiece piece={piece} />}
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
});