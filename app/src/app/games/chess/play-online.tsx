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
import { ChessBoard } from "@/components/ChessBoard";
import { useOnlineChess } from "@/hooks/useOnlineChess";
import { useSocketStatus } from "@/lib/websocket";
import * as core from "@/lib/chess";
import type {
  ChessBoard as Board,
  ChessMove,
  ChessOwner,
  ChessPieceType,
} from "@/lib/chess";

function pal(owner: number) {
  return owner === 0 ? core.BOARD_COLORS.darkPiece : core.BOARD_COLORS.lightPiece;
}

export default function ChessPlayOnlineScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const navigation = useNavigation();
  const socketStatus = useSocketStatus();
  const { game, makeMove, leaveRoom, toDisplayIndex, toAbsoluteIndex } =
    useOnlineChess();
  const [selected, setSelected] = useState<number | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<ChessMove | null>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      leaveRoom();
    });
    return unsubscribe;
  }, [navigation, leaveRoom]);

  // A stale selection or pending promotion is cleared lazily: selection is only
  // honoured while it is still one of my sources, and the promotion overlay
  // only shows while it is still my turn.
  const activeSelected =
    selected !== null && game.phase === "playing" && game.isMyTurn ? selected : null;
  const activePromotion =
    pendingPromotion !== null && game.phase === "playing" && game.isMyTurn
      ? pendingPromotion
      : null;

  const isMyTurn = game.phase === "playing" && game.isMyTurn;
  const currentOwner = (game.currentPlayerIndex ?? game.playerIndex ?? 0) as ChessOwner;
  const isFlipped = game.playerIndex === 1;

  const sources = useMemo(() => {
    if (!isMyTurn) return [];
    return core.playableSources(
      game.board,
      currentOwner,
      game.castlingRights,
      game.enPassantTarget
    );
  }, [isMyTurn, game.board, currentOwner, game.castlingRights, game.enPassantTarget]);

  const destinations = useMemo(() => {
    if (game.phase !== "playing" || activeSelected === null) return [];
    return core
      .legalMovesFrom(game.board, activeSelected, game.castlingRights, game.enPassantTarget)
      .map((m) => m.to);
  }, [game.phase, game.board, activeSelected, game.castlingRights, game.enPassantTarget]);

  const checkSquare = useMemo(() => {
    if (game.phase !== "playing" && game.phase !== "gameOver") return null;
    if (!core.isInCheck(game.board, currentOwner)) return null;
    return core.findKing(game.board, currentOwner);
  }, [game.board, currentOwner, game.phase]);

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
  const displaySelected =
    activeSelected === null ? null : toDisplayIndex(activeSelected);
  const displayLastMove = useMemo(
    () =>
      game.lastMove
        ? {
            from: toDisplayIndex(game.lastMove.from),
            to: toDisplayIndex(game.lastMove.to),
          }
        : null,
    [game.lastMove, toDisplayIndex]
  );
  const displayCheckSquare = checkSquare === null ? null : toDisplayIndex(checkSquare);

  const commitMove = useCallback(
    (from: number, to: number, promotion?: ChessPieceType) => {
      makeMove(from, to, promotion);
      setSelected(null);
      setPendingPromotion(null);
    },
    [makeMove]
  );

  const onSquarePress = useCallback(
    (displayIndex: number) => {
      if (game.phase !== "playing") return;
      if (!game.isMyTurn) return;
      if (activePromotion) return;
      const index = toAbsoluteIndex(displayIndex);

      if (selected === null) {
        if (!sources.includes(index)) return;
        setSelected(index);
        return;
      }

      if (index === selected) {
        setSelected(null);
        return;
      }

      // Stale selection: the opponent moved while this square was selected. Only
      // honour moves from a square that is still one of my current sources.
      if (!sources.includes(selected)) {
        setSelected(sources.includes(index) ? index : null);
        return;
      }

      const moves = core.legalMovesFrom(
        game.board,
        selected,
        game.castlingRights,
        game.enPassantTarget
      );
      const dest = moves.find((m) => m.to === index);
      if (dest) {
        if (dest.promotion) {
          setPendingPromotion({ from: selected, to: index });
          setSelected(null);
          return;
        }
        commitMove(selected, index);
        return;
      }

      if (sources.includes(index)) {
        setSelected(index);
        return;
      }

      setSelected(null);
    },
    [
      game.phase,
      game.isMyTurn,
      game.board,
      game.castlingRights,
      game.enPassantTarget,
      selected,
      sources,
      activePromotion,
      toAbsoluteIndex,
      commitMove,
    ]
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
  const hint = activePromotion
    ? "Your pawn reaches the far rank — choose a piece to promote it to."
    : game.phase === "playing" && core.isInCheck(game.board, currentOwner)
      ? isMyTurn
        ? "You're in check — get your king safe."
        : "Opponent is in check!"
      : isMyTurn
        ? "White opens first. Touch a piece to see its moves."
        : game.phase === "playing"
          ? "Waiting for the opponent's move…"
          : "";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ScreenHeader title="Chess" />

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
                  const owner = (player.playerIndex === 0 ? 0 : 1) as ChessOwner;
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
                      <View style={[styles.playerDisc, { backgroundColor: p.base, borderColor: p.rim }]} />
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
            <ChessBoard
              board={displayBoard}
              onSquarePress={onSquarePress}
              sources={displaySources}
              selected={displaySelected}
              destinations={displayDestinations}
              lastMove={displayLastMove}
              checkSquare={displayCheckSquare}
              disabled={!isMyTurn}
              flipped={isFlipped}
              promoting={activePromotion !== null}
              promotingOwner={currentOwner}
              onPromotionPick={(type) => {
                if (activePromotion) {
                  commitMove(activePromotion.from, activePromotion.to, type);
                }
              }}
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
  playerDisc: {
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