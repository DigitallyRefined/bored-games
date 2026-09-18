import React, { useEffect, useMemo, useState } from "react";
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
import { BattleshipCase } from "@/components/BattleshipCase";
import { ShipPlacement } from "@/components/ShipPlacement";
import type { PanelAccent } from "@/components/BattleshipPanel";
import { useOnlineBattleships } from "@/hooks/useOnlineBattleships";
import * as core from "@/lib/battleships";
import type { Fleet, Orientation, ShipId } from "@/lib/battleships";

function accentFor(symbol: string): PanelAccent {
  return symbol === "Blue" ? "blue" : "red";
}

export default function BattleshipsPlayOnlineScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const navigation = useNavigation();
  const { game, place, deployFleet, fire, leaveRoom } = useOnlineBattleships();

  const [selectedShip, setSelectedShip] = useState<ShipId | null>("carrier");
  const [orientation, setOrientation] = useState<Orientation>("h");

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      leaveRoom();
    });
    return unsubscribe;
  }, [navigation, leaveRoom]);

  const me = game.playerIndex ?? 0;
  const opponent = 1 - me;
  const accent = accentFor(game.players[me]?.symbol ?? "Red");
  const isPlaying = game.phase === "playing";
  const isOver = game.phase === "gameOver";
  const isMyTurn = isPlaying && game.currentPlayerIndex === me;

  const winnerSymbol =
    game.winner === "draw" ? null : game.players[game.winner ?? 0]?.symbol ?? "Someone";

  const statusText = isOver
    ? winnerSymbol
      ? `${winnerSymbol} sinks the last ship and wins!`
      : "It's a draw!"
    : game.phase === "placing"
      ? game.placed[me]
        ? "Fleet deployed — waiting for the opponent"
        : "Place your fleet"
      : isMyTurn
        ? "Your turn — fire a shot!"
        : "Opponent's turn…";

  const radarSunkCells = useMemo(() => {
    if (!isPlaying) return null;
    return new Set(
      game.ships[opponent].filter((s) => s.sunk).flatMap((s) => s.cells ?? []),
    );
  }, [isPlaying, game.ships, opponent]);

  const myFleet: Fleet = isOver && game.serverFleets ? game.serverFleets[me] : game.myFleet;
  const radarFleet: Fleet | null =
    isOver && game.serverFleets ? game.serverFleets[opponent] : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ScreenHeader title="Battleships" backTo="/games/battleships/online" />

          <View style={styles.playersRow}>
            {game.players.map((player, index) => {
              const pal = core.fleetPalette(player.symbol === "Red" ? "red" : "blue");
              const isActive =
                index === game.currentPlayerIndex && game.phase === "playing";
              return (
                <View key={index} style={styles.playerChipWrap}>
                  <View
                    style={[
                      styles.playerChip,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: isActive ? pal.base : theme.borderLight,
                      },
                    ]}
                  >
                    <View style={[styles.playerDot, { backgroundColor: pal.base }]} />
                    <Text style={[styles.playerText, { color: isActive ? pal.dark : theme.text }]}>
                      {player.symbol}
                    </Text>
                    {index === game.playerIndex && (
                      <Text style={[styles.youLabel, { color: theme.textSecondary }]}>you</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[styles.statusChip, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.statusText, { color: theme.text }]}>{statusText}</Text>
          </View>

          {game.error && (
            <View style={[styles.errorCard, { borderColor: theme.danger }]}>
              <Text style={[styles.errorText, { color: theme.danger }]}>{game.error}</Text>
            </View>
          )}

          <View style={styles.body}>
            {game.phase === "placing" && (
              <ShipPlacement
                fleet={game.myFleet}
                selectedShip={game.placed[me] ? null : selectedShip}
                orientation={orientation}
                accent={accent}
                onPressCell={(cell) => place(cell, selectedShip, orientation)}
                onSelectShip={setSelectedShip}
                onToggleOrientation={() => setOrientation((o) => (o === "h" ? "v" : "h"))}
                onDeploy={() => deployFleet(core.placementsFromFleet(game.myFleet))}
                deployed={game.placed[me]}
              />
            )}

            {(isPlaying || isOver) && (
              <View style={styles.boardBlock}>
                <BattleshipCase
                  logo="BATTLESHIPS"
                  panels={[
                    {
                      title: `${accent === "red" ? "Red" : "Blue"} fleet`,
                      ships: myFleet,
                      shots: game.shots[me],
                      accent,
                    },
                    {
                      title: isMyTurn && isPlaying ? "Radar — fire here" : "Radar",
                      ships: radarFleet,
                      shots: game.shots[opponent],
                      onCellPress: isMyTurn ? fire : undefined,
                      disabled: isPlaying && !isMyTurn,
                      accent,
                      highlight: radarSunkCells,
                    },
                  ]}
                />
                {isMyTurn && (
                  <Text style={[styles.hint, { color: theme.textSecondary }]}>
                    Tap a square on your radar to fire at the enemy fleet.
                  </Text>
                )}
              </View>
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
    maxWidth: 500,
    alignSelf: "center",
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
  },
  playersRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.three,
  },
  playerChipWrap: {
    flex: 1,
    maxWidth: 160,
  },
  playerChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 6,
    borderWidth: 2,
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  playerText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
  },
  youLabel: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.xs,
  },
  statusChip: {
    alignSelf: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D8DCE0",
  },
  statusText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  errorCard: {
    borderWidth: 2,
    borderRadius: 6,
    padding: Spacing.three,
  },
  errorText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.4,
    textAlign: "center",
  },
  body: {
    gap: Spacing.five,
  },
  boardBlock: {
    gap: Spacing.four,
  },
  hint: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.4,
    textAlign: "center",
  },
});