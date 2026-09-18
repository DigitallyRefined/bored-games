import React, { useRef, useCallback } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  useColorScheme,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useTicTacToe } from "@/hooks/useTicTacToe";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SketchyButton } from "@/components/SketchyButton";

export default function TicTacToeLocalScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const game = useTicTacToe();
  const { makeMove, reset } = game;
  const cellAnims = useRef(
    Array.from({ length: 9 }, () => new Animated.Value(0))
  ).current;
  const pendingReset = useRef(false);

  const handleCellPress = useCallback(
    (index: number) => {
      if (pendingReset.current) return;
      const anim = cellAnims[index];
      anim.stopAnimation();
      anim.setValue(1);
      Animated.timing(anim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
      makeMove(index);
    },
    [cellAnims, makeMove]
  );

  const handleReset = useCallback(() => {
    pendingReset.current = true;
    cellAnims.forEach((anim) => {
      anim.stopAnimation();
      anim.setValue(0);
    });
    reset();
    setTimeout(() => {
      pendingReset.current = false;
    }, 50);
  }, [cellAnims, reset]);

  const statusColor = game.winner === null ? theme.accent : game.winner === "draw" ? theme.warning : theme.success;

  const getStatusText = () => {
    if (game.winner === "X") return "X wins!";
    if (game.winner === "O") return "O wins!";
    if (game.winner === "draw") return "It's a draw!";
    return `${game.currentPlayer}'s turn`;
  };
  const statusSymbol = game.winner === null ? (game.currentPlayer === "X" ? "✗" : "○") : "✓";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <ScreenHeader title="Tic-Tac-Toe" backTo="/games/tic-tac-toe" />

          <View style={styles.statusRow}>
            <View
              style={[
                styles.playerChip,
                {
                  backgroundColor: statusColor + "1a",
                },
              ]}
            >
              <Text style={[styles.playerChipSymbol, { color: statusColor }]}>
                {statusSymbol}
              </Text>
              <Text style={[styles.playerChipText, { color: statusColor }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>

          <View style={styles.boardWrapper}>
            <View style={[styles.board, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.boardLines}>
                <View style={[styles.boardLine, { backgroundColor: theme.borderLight, top: "33.33%" }]} />
                <View style={[styles.boardLine, { backgroundColor: theme.borderLight, top: "66.66%" }]} />
                <View style={[styles.boardLineVertical, { backgroundColor: theme.borderLight, left: "33.33%" }]} />
                <View style={[styles.boardLineVertical, { backgroundColor: theme.borderLight, left: "66.66%" }]} />
              </View>
              {/* eslint-disable-next-line react-hooks/refs -- Animated API maps over a ref-held array of Animated.Value */}
              {game.board.map((cell, index) => {
                const isWinningCell = game.winningLine?.includes(index) ?? false;
                return (
                  <Pressable
                    key={index}
                    style={styles.cell}
                    onPress={() => handleCellPress(index)}
                    disabled={cell !== null || game.isGameOver}
                  >
                    <Animated.View
                      style={[
                        styles.cellPressOverlay,
                        {
                          backgroundColor: theme.accent,
                          opacity: cellAnims[index],
                          pointerEvents: "none"
                        },
                      ]}
                    />
                    {cell === "X" ? (
                      <Text
                        style={[
                          styles.cellX,
                          { color: theme.accent },
                          isWinningCell && styles.winningSymbol,
                        ]}
                      >
                        ✗
                      </Text>
                    ) : cell === "O" ? (
                      <Text
                        style={[
                          styles.cellO,
                          { color: theme.danger },
                          isWinningCell && styles.winningSymbol,
                        ]}
                      >
                        ○
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.controls}>
            <SketchyButton
              title="New game"
              variant="primary"
              onPress={handleReset}
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
    marginBottom: Spacing.six,
  },
  playerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: 20,
  },
  playerChipSymbol: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.xxl,
    lineHeight: FontSize.xxl * 1.2,
  },
  playerChipText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * 1.3,
  },
  boardWrapper: {
    alignItems: "center",
  },
  board: {
    width: 320,
    height: 320,
    borderRadius: 10,
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  boardLines: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  boardLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
  },
  boardLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
  },
  cell: {
    width: "33.333%",
    height: "33.333%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  },
  cellPressOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  cellX: {
    fontFamily: "Caveat_400Regular",
    fontSize: 76,
    lineHeight: 86,
  },
  cellO: {
    fontFamily: "Caveat_400Regular",
    fontSize: 70,
    lineHeight: 80,
  },
  winningSymbol: {
    transform: [{ scale: 1.15 }],
    opacity: 0.9,
  },
  controls: {
    flexDirection: "row",
    gap: Spacing.four,
    marginTop: Spacing.seven,
    justifyContent: "center",
  },
  resetButton: {
    minWidth: 120,
  },
});