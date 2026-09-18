import React, { useRef, useCallback, useMemo, useEffect } from "react";
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
import { useRouter, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SketchyButton } from "@/components/SketchyButton";
import { useOnlineTicTacToe } from "@/hooks/useOnlineTicTacToe";
import { winningLineFor } from "@shared/games/tic-tac-toe";
import { useSocketStatus } from "@/lib/websocket";

export default function TicTacToePlayOnlineScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const navigation = useNavigation();
  const socketStatus = useSocketStatus();
  const { game, makeMove, leaveRoom } = useOnlineTicTacToe();
  const cellAnims = useRef(
    Array.from({ length: 9 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      leaveRoom();
    });
    return unsubscribe;
  }, [navigation, leaveRoom]);

  const winningLine = useMemo(
    () =>
      game.winner === null || game.winner === "draw"
        ? null
        : winningLineFor(game.board, game.winner),
    [game.winner, game.board]
  );

  const handleCellPress = useCallback(
    (index: number) => {
      if (game.phase !== "playing") return;
      if (!game.isMyTurn) return;
      if (game.board[index] !== null) return;
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
    [game.phase, game.isMyTurn, game.board, cellAnims, makeMove]
  );

  const handleLeave = useCallback(() => {
    router.replace("/games/tic-tac-toe/online");
  }, [router]);

  const getStatusText = (): { text: string; color: string } => {
    if (game.winner === "draw") {
      return { text: "It's a draw!", color: theme.warning };
    }
    if (game.winner) {
      return {
        text: game.winner === game.symbol ? "You win!" : "You lose",
        color: game.winner === game.symbol ? theme.success : theme.danger,
      };
    }
    if (game.phase === "error") {
      return { text: game.error ?? "Game ended", color: theme.danger };
    }
    if (game.isMyTurn) {
      return { text: "Your turn", color: theme.accent };
    }
    if (game.phase === "gameOver") {
      return { text: "Game over", color: theme.textSecondary };
    }
    return {
      text: "Opponent's turn",
      color: theme.textSecondary,
    };
  };

  const status = getStatusText();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ScreenHeader title="Tic-Tac-Toe" />

          <View style={styles.roomRow}>
            <View style={styles.connectionRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      socketStatus === "connected"
                        ? theme.success
                        : socketStatus === "reconnecting"
                          ? theme.warning
                          : theme.danger,
                  },
                ]}
              />
              <Text style={[styles.connectionText, { color: theme.textSecondary }]}>
                {socketStatus === "connected"
                  ? "Connected"
                  : socketStatus === "connecting"
                    ? "Connecting…"
                    : socketStatus === "reconnecting"
                      ? "Reconnecting…"
                      : "Not connected"}
              </Text>
              {game.code && (
                <Text style={[styles.roomText, { color: theme.textSecondary }]}>
                  • Room {game.code}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.playersRow}>
            {game.players.map((player) => {
              const isMe = player.playerIndex === game.playerIndex;
              const isActive = game.currentPlayerIndex === player.playerIndex;
              return (
                <View
                  key={player.userId}
                  style={[
                    styles.playerCard,
                    {
                      backgroundColor: isMe ? theme.accent + "1a" : "transparent",
                      borderColor: isActive ? theme.accent : "transparent",
                    },
                  ]}
                >
                  <Text style={[styles.playerSymbol, { color: isMe ? theme.accent : theme.textSecondary }]}>
                    {player.symbol}
                  </Text>
                  <Text style={[styles.playerName, { color: isMe ? theme.accent : theme.textSecondary }]}>
                    {isMe ? "You" : "Opponent"}
                  </Text>
                  {isActive && (
                    <Text style={[styles.playerTurn, { color: theme.accent }]}>Turn</Text>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.playerChip, { backgroundColor: status.color + "1a" }]}>
              <Text style={[styles.playerChipText, { color: status.color }]}>{status.text}</Text>
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
                const isWinningCell =
                  game.phase === "gameOver" && (winningLine?.includes(index) ?? false);
                return (
                  <Pressable
                    key={index}
                    style={styles.cell}
                    onPress={() => handleCellPress(index)}
                    disabled={cell !== null || !game.isMyTurn || game.phase !== "playing"}
                  >
                    <Animated.View
                      style={[
                        styles.cellPressOverlay,
                        {
                          backgroundColor: theme.accent,
                          opacity: cellAnims[index],
                          pointerEvents: "none",
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
            {game.phase === "gameOver" || game.phase === "error" ? (
              <SketchyButton
                title="Back to lobby"
                variant="primary"
                onPress={handleLeave}
                style={styles.leaveButton}
              />
            ) : (
              <SketchyButton
                title="Leave game"
                variant="outline"
                onPress={handleLeave}
                style={styles.leaveButton}
              />
            )}
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
  roomRow: {
    alignItems: "center",
    marginBottom: Spacing.four,
  },
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectionText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
  },
  roomText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
  },
  playersRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.five,
    marginBottom: Spacing.five,
  },
  playerCard: {
    alignItems: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 6,
    borderWidth: 2,
    minWidth: 110,
  },
  playerSymbol: {
    fontFamily: Fonts.title,
    fontSize: FontSize.xxxl,
    lineHeight: FontSize.xxxl * 1.1,
  },
  playerName: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.sm,
    marginTop: Spacing.one,
  },
  playerTurn: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.xs,
    marginTop: Spacing.one,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statusRow: {
    alignItems: "center",
    marginBottom: Spacing.six,
  },
  playerChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: 20,
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
    justifyContent: "center",
    marginTop: Spacing.seven,
  },
  leaveButton: {
    minWidth: 140,
  },
});