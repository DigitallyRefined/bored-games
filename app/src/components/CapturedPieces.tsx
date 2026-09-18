import { StyleSheet, Text, View } from "react-native";

import { BOARD_COLORS, PIECE_GLYPHS, capturedBy } from "@/lib/chess";
import type { ChessBoard, ChessOwner } from "@/lib/chess";

// Small row of glyphs showing the pieces `owner` has captured from the
// opponent, drawn in the captured side's wood colours.
export function CapturedPieces({
  board,
  owner,
}: {
  board: ChessBoard;
  owner: ChessOwner;
}) {
  const captured = capturedBy(board, owner);
  const palette = owner === 0 ? BOARD_COLORS.darkPiece : BOARD_COLORS.lightPiece;

  if (captured.length === 0) {
    return <Text style={[styles.empty, { color: palette.base }]}>—</Text>;
  }

  return (
    <View style={styles.row}>
      {captured.map((type, index) => (
        <Text
          key={`${type}-${index}`}
          style={[
            styles.glyph,
            {
              color: palette.base,
              textShadowColor: palette.outline,
            },
          ]}
        >
          {PIECE_GLYPHS[type]}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    alignItems: "center",
  },
  glyph: {
    fontSize: 13,
    lineHeight: 15,
    textShadowOffset: { width: 0.4, height: 0.7 },
    textShadowRadius: 0.4,
    fontWeight: "600",
  },
  empty: {
    fontSize: 13,
    lineHeight: 15,
  },
});