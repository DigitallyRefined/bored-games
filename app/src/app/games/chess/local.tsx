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
import { useChess } from "@/hooks/useChess";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SketchyButton } from "@/components/SketchyButton";
import { ChessBoard } from "@/components/ChessBoard";
import { CapturedPieces } from "@/components/CapturedPieces";
import { BOARD_COLORS } from "@/lib/chess";

function SideIndicator({ owner }: { owner: 0 | 1 }) {
  const palette = owner === 0 ? BOARD_COLORS.darkPiece : BOARD_COLORS.lightPiece;
  return (
    <View
      style={[
        styles.colorDisc,
        {
          backgroundColor: palette.base,
          borderColor: palette.rim,
        },
      ]}
    />
  );
}

export default function ChessLocalScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const game = useChess();
  const { pressSquare, pickPromotion, reset, state } = game;

  const statusText = useCallback(() => {
    if (game.winner === 0) return "White wins!";
    if (game.winner === 1) return "Black wins!";
    if (game.winner === "draw") return "It's a draw!";
    return state.currentPlayerIndex === 0 ? "White to move" : "Black to move";
  }, [game.winner, state.currentPlayerIndex]);

  const activeOwner: 0 | 1 =
    game.winner === null || game.winner === "draw"
      ? state.currentPlayerIndex
      : game.winner;
  const statusColor =
    game.winner === null || game.winner === "draw" ? theme.accent : theme.success;
  const hint = game.pendingPromotion
    ? "Your pawn reaches the far rank — choose a piece to promote it to."
    : "Check your opponent, castle to safety, and crown a pawn for the win.";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ScreenHeader title="Chess" backTo="/games/chess" />

          <View style={styles.statusRow}>
            <View style={[styles.playerChip, { backgroundColor: statusColor + "1a" }]}>
              <SideIndicator owner={activeOwner} />
              <Text style={[styles.playerChipText, { color: statusColor }]}>{statusText()}</Text>
            </View>
          </View>

          <View style={styles.countsRow}>
            <View style={[styles.countChip, { backgroundColor: theme.backgroundElement }]}>
              <SideIndicator owner={0} />
              <CapturedPieces board={state.board} owner={0} />
            </View>
            <View style={[styles.countDivider, { backgroundColor: theme.borderLight }]} />
            <View style={[styles.countChip, { backgroundColor: theme.backgroundElement }]}>
              <SideIndicator owner={1} />
              <CapturedPieces board={state.board} owner={1} />
            </View>
          </View>

          <View style={styles.boardWrapper}>
            <ChessBoard
              board={state.board}
              onSquarePress={pressSquare}
              sources={game.sources}
              selected={game.selected}
              destinations={game.destinations}
              lastMove={state.lastMove}
              checkSquare={game.checkSquare}
              promoting={game.pendingPromotion !== null}
              promotingOwner={state.currentPlayerIndex}
              onPromotionPick={pickPromotion}
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
  colorDisc: {
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
    maxWidth: "46%",
    minHeight: 30,
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