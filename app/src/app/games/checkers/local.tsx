import React, { useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useCheckers } from "@/hooks/useCheckers";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SketchyButton } from "@/components/SketchyButton";
import { CheckersBoard } from "@/components/CheckersBoard";
import { BOARD_COLORS, pieceCounts } from "@/lib/checkers";

function PieceColorDot({ owner }: { owner: 0 | 1 }) {
  const palette = owner === 0 ? BOARD_COLORS.darkPiece : BOARD_COLORS.lightPiece;
  return (
    <View
      style={[
        styles.colorDot,
        {
          backgroundColor: palette.base,
          borderColor: palette.rim,
        },
      ]}
    />
  );
}

export default function CheckersLocalScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const game = useCheckers();
  const { pressSquare, reset } = game;

  const counts = pieceCounts(game.board);

  const statusText = useCallback(() => {
    if (game.winner === 0) return "Dark wins!";
    if (game.winner === 1) return "Light wins!";
    if (game.winner === "draw") return "It's a draw!";
    return game.currentPlayer === 0 ? "Dark to move" : "Light to move";
  }, [game.winner, game.currentPlayer]);

  const activeOwner: 0 | 1 = game.winner === null ? game.currentPlayer : game.winner === "draw" ? game.currentPlayer : game.winner;
  const statusColor = game.winner === null || game.winner === "draw" ? theme.accent : theme.success;
  const hint = game.path.length > 0
    ? "Keep jumping — a capture chain must continue."
    : "Captures are compulsory. Touching a piece highlights its squares.";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ScreenHeader title="Checkers" backTo="/games/checkers" />

          <View style={styles.statusRow}>
            <View style={[styles.playerChip, { backgroundColor: statusColor + "1a" }]}>
              <PieceColorDot owner={activeOwner} />
              <Text style={[styles.playerChipText, { color: statusColor }]}>{statusText()}</Text>
            </View>
          </View>

          <View style={styles.countsRow}>
            <View style={[styles.countChip, { backgroundColor: theme.backgroundElement }]}>
              <PieceColorDot owner={0} />
              <Text style={[styles.countText, { color: theme.text }]}>{counts[0]}</Text>
            </View>
            <View style={[styles.countDivider, { backgroundColor: theme.borderLight }]} />
            <View style={[styles.countChip, { backgroundColor: theme.backgroundElement }]}>
              <PieceColorDot owner={1} />
              <Text style={[styles.countText, { color: theme.text }]}>{counts[1]}</Text>
            </View>
          </View>

          <View style={styles.boardWrapper}>
            <CheckersBoard
              board={game.board}
              onSquarePress={pressSquare}
              sources={game.sources}
              selected={game.selected}
              destinations={game.destinations}
              captureDestinations={game.captureDestinations}
              lastMovePath={game.lastMovePath}
            />
          </View>

          <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text>

          <View style={styles.controls}>
            <SketchyButton
              title="New game"
              variant="primary"
              onPress={reset}
              style={styles.resetButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: Spacing.six,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: Spacing.five,
  },
  statusRow: {
    alignItems: "center",
    marginBottom: Spacing.five,
  },
  playerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: 20,
  },
  playerChipText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * 1.3,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  countsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    marginBottom: Spacing.five,
  },
  countChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
  },
  countText: {
    fontFamily: Fonts.title,
    fontSize: FontSize.xl,
    lineHeight: FontSize.xl * 1.1,
  },
  countDivider: {
    width: 1,
    height: 18,
  },
  boardWrapper: {
    width: "100%",
    alignItems: "center",
    maxWidth: 380,
    alignSelf: "center",
  },
  hint: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.4,
    textAlign: "center",
    marginTop: Spacing.four,
  },
  controls: {
    flexDirection: "row",
    gap: Spacing.four,
    marginTop: Spacing.five,
    justifyContent: "center",
  },
  resetButton: {
    minWidth: 120,
  },
});