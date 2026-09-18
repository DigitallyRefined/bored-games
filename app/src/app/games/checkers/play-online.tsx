import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CheckersBoard } from "@/components/CheckersBoard";
import { useOnlineCheckers } from "@/hooks/useOnlineCheckers";
import { useSocketStatus } from "@/lib/websocket";
import * as core from "@/lib/checkers";
import type { CheckersBoard as Board, CheckersOwner } from "@/lib/checkers";

function pal(owner: number) {
  return owner === 0 ? core.BOARD_COLORS.darkPiece : core.BOARD_COLORS.lightPiece;
}

export default function CheckersPlayOnlineScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const navigation = useNavigation();
  const socketStatus = useSocketStatus();
  const { game, makeMove, leaveRoom, toDisplayIndex, toAbsoluteIndex } =
    useOnlineCheckers();
  const [selected, setSelected] = useState<number | null>(null);
  const [path, setPath] = useState<number[]>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      leaveRoom();
    });
    return unsubscribe;
  }, [navigation, leaveRoom]);

  const isMyTurn = game.phase === "playing" && game.isMyTurn;
  const currentOwner = (game.currentPlayerIndex ?? game.playerIndex ?? 0) as CheckersOwner;

  const sources = useMemo(() => {
    if (!isMyTurn) return [];
    return core.playableSources(game.board, currentOwner);
  }, [isMyTurn, game.board, currentOwner]);

  const destinations = useMemo(() => {
    if (game.phase !== "playing") return [];
    if (path.length > 0) return core.continuationOptions(game.board, path).map((o) => o.to);
    if (selected === null) return [];
    return core.legalOptions(game.board, selected).map((o) => o.to);
  }, [game.phase, game.board, path, selected]);

  const captureDestinations = useMemo(() => {
    if (game.phase !== "playing") return [];
    if (path.length > 0)
      return core.continuationOptions(game.board, path).filter((o) => o.jumped !== null).map((o) => o.to);
    if (selected === null) return [];
    return core.legalOptions(game.board, selected).filter((o) => o.jumped !== null).map((o) => o.to);
  }, [game.phase, game.board, path, selected]);

  const displayBoard = useMemo(() => {
    const mapped: Board = new Array(core.CELL_COUNT).fill(null);
    for (let i = 0; i < core.CELL_COUNT; i++) {
      mapped[toDisplayIndex(i)] = game.board[i] ?? null;
    }
    return mapped;
  }, [game.board, toDisplayIndex]);

  const displaySources = useMemo(() => sources.map(toDisplayIndex), [sources, toDisplayIndex]);
  const displayDestinations = useMemo(
    () => destinations.map(toDisplayIndex),
    [destinations, toDisplayIndex]
  );
  const displayCaptureDestinations = useMemo(
    () => captureDestinations.map(toDisplayIndex),
    [captureDestinations, toDisplayIndex]
  );
  const displaySelected = selected === null ? null : toDisplayIndex(selected);
  const displayLastMovePath = useMemo(
    () => (game.lastMovePath ? game.lastMovePath.map(toDisplayIndex) : null),
    [game.lastMovePath, toDisplayIndex]
  );

  const commitMove = useCallback(
    (movePath: number[]) => {
      makeMove(movePath);
      setPath([]);
      setSelected(null);
    },
    [makeMove]
  );

  const onSquarePress = useCallback(
    (displayIndex: number) => {
      if (game.phase !== "playing") return;
      if (!game.isMyTurn) return;
      const index = toAbsoluteIndex(displayIndex);

      if (path.length > 0) {
        const options = core.continuationOptions(game.board, path);
        if (!options.some((o) => o.to === index)) return;
        const nextPath = [...path, index];
        const { promoted } = core.applyPath(game.board, nextPath);
        if (promoted || core.continuationOptions(game.board, nextPath).length === 0) {
          commitMove(nextPath);
        } else {
          setPath(nextPath);
          setSelected(index);
        }
        return;
      }

      if (selected === null) {
        if (!sources.includes(index)) return;
        setSelected(index);
        return;
      }

      if (index === selected) {
        setSelected(null);
        return;
      }

      const options = core.legalOptions(game.board, selected);
      if (options.some((o) => o.to === index)) {
        const nextPath = [selected, index];
        const { promoted } = core.applyPath(game.board, nextPath);
        if (promoted || core.continuationOptions(game.board, nextPath).length === 0) {
          commitMove(nextPath);
        } else {
          setPath(nextPath);
          setSelected(index);
        }
        return;
      }

      if (sources.includes(index)) {
        setSelected(index);
        return;
      }

      setSelected(null);
    },
    [game.phase, game.isMyTurn, game.board, path, selected, sources, toAbsoluteIndex, commitMove]
  );

  const getStatusText = (): { text: string; color: string } => {
    if (game.winner === "draw") {
      return { text: "It's a draw!", color: theme.warning };
    }
    if (game.winner !== null) {
      return {
        text: game.winner === game.playerIndex ? "You win!" : "You lose",
        color: game.winner === game.playerIndex ? theme.success : theme.danger,
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
    return { text: "Opponent's turn", color: theme.textSecondary };
  };

  const status = getStatusText();
  const hint =
    path.length > 0
      ? "Keep jumping — a capture chain must continue."
      : isMyTurn
        ? "Captures are compulsory. Touch a piece to see its moves."
        : game.phase === "playing"
          ? "Waiting for the opponent's move…"
          : "";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ScreenHeader title="Checkers" />

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
            {game.players.length > 0
              ? game.players.map((player) => {
                  const isMe = player.playerIndex === game.playerIndex;
                  const isActive = game.currentPlayerIndex === player.playerIndex;
                  const owner = player.symbol === "Dark" ? (0 as CheckersOwner) : (1 as CheckersOwner);
                  const p = pal(owner);
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
                      <View style={[styles.playerDot, { backgroundColor: p.base, borderColor: p.rim }]} />
                      <Text style={[styles.playerName, { color: isMe ? theme.accent : theme.textSecondary }]}>
                        {isMe ? "You" : "Opponent"}
                      </Text>
                      <Text style={[styles.playerSymbol, { color: theme.textSecondary }]}>{player.symbol}</Text>
                      {isActive && (
                        <Text style={[styles.playerTurn, { color: theme.accent }]}>Turn</Text>
                      )}
                    </View>
                  );
                })
              : null}
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.playerChip, { backgroundColor: status.color + "1a" }]}>
              <Text style={[styles.playerChipText, { color: status.color }]}>{status.text}</Text>
            </View>
          </View>

          <View style={styles.boardWrapper}>
            <CheckersBoard
              board={displayBoard}
              onSquarePress={onSquarePress}
              sources={displaySources}
              selected={displaySelected}
              destinations={displayDestinations}
              captureDestinations={displayCaptureDestinations}
              lastMovePath={displayLastMovePath}
            />
          </View>

          {hint ? <Text style={[styles.hint, { color: theme.textSecondary }]}>{hint}</Text> : null}
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
  playerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginBottom: Spacing.one,
  },
  playerName: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
  },
  playerSymbol: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.xs,
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
    marginBottom: Spacing.five,
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
});