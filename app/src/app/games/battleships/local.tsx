import React from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { BorderRadius, Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SketchyButton } from "@/components/SketchyButton";
import { BattleshipCase } from "@/components/BattleshipCase";
import { ShipPlacement } from "@/components/ShipPlacement";
import type { PanelAccent } from "@/components/BattleshipPanel";
import { useBattleships } from "@/hooks/useBattleships";
import * as core from "@/lib/battleships";

const ACCENTS: PanelAccent[] = ["red", "blue"];

export default function BattleshipsLocalScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const game = useBattleships();

  const accent = ACCENTS[game.activePlayer];
  const opponent = 1 - game.activePlayer;
  const nextPlayer = 1 - game.activePlayer;
  const isOver = game.phase === "over";

  const statusText = isOver
    ? game.winner === "draw"
      ? "It's a draw! The seas are quiet once more."
      : `${game.winner === 0 ? "Red" : "Blue"} sinks the last ship and rules the sea!`
    : game.phase === "placing"
      ? `Player ${game.activePlayer + 1} — place your fleet`
      : game.handoff
        ? `Pass the device — Player ${nextPlayer + 1} fires next`
        : `Player ${game.activePlayer + 1} — fire a shot`;

  const sunkCells = React.useMemo(() => {
    if (game.phase !== "playing") return new Set<number>();
    const status = core.fleetStatus(
      game.game.fleets[opponent],
      game.game.shots[opponent],
    );
    return new Set(status.filter((s) => s.sunk).flatMap((s) => s.cells ?? []));
  }, [game.phase, game.game.fleets, game.game.shots, opponent]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ScreenHeader title="Battleships" backTo="/games/battleships" />

          <View style={[styles.statusChip, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.statusDot, { backgroundColor: (game.handoff ? ACCENTS[nextPlayer] : accent) === "red" ? core.BATTLE_COLORS.shipRed.base : core.BATTLE_COLORS.shipBlue.base }]} />
            <Text style={[styles.statusText, { color: theme.text }]}>{statusText}</Text>
          </View>

          {game.phase === "placing" && (
            <View style={styles.phaseBlock}>
              <Text style={[styles.passNote, { color: theme.textSecondary }]}>
                {game.activePlayer === 1
                  ? "Hand the device over — Player 2 places their fleet. The other fleet stays hidden!"
                  : "Each player sets up their ships. No peeking at the other ocean!"}
              </Text>
              <ShipPlacement
                fleet={game.game.fleets[game.activePlayer]}
                selectedShip={game.selectedShip}
                orientation={game.orientation}
                accent={accent}
                onPressCell={game.pressCell}
                onSelectShip={game.selectShip}
                onToggleOrientation={game.toggleOrientation}
                onDeploy={game.confirmFleet}
                deployLabel={
                  game.activePlayer === 0
                    ? "All set — pass to Player 2"
                    : "Deploy the fleet!"
                }
              />
            </View>
          )}

          {game.phase === "playing" && game.handoff && (
            <View style={styles.phaseBlock}>
              <View
                style={[
                  styles.handoffCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor:
                      (ACCENTS[nextPlayer] === "red"
                        ? core.BATTLE_COLORS.shipRed.base
                        : core.BATTLE_COLORS.shipBlue.base) + "88",
                  },
                ]}
              >
                <Text style={[styles.handoffTitle, { color: theme.text }]}>Pass the device!</Text>
                <Text style={[styles.handoffText, { color: theme.textSecondary }]}>
                  Hand it to Player {nextPlayer + 1} to take the next shot. No peeking
                  at the other ocean!
                </Text>
                <SketchyButton
                  title="Show my board"
                  variant="primary"
                  onPress={game.confirmHandoff}
                  style={styles.passButton}
                />
              </View>
            </View>
          )}

          {game.phase === "playing" && !game.handoff && (
            <View style={styles.phaseBlock}>
              <BattleshipCase
                logo="BATTLESHIPS"
                panels={[
                  {
                    title: `${accent === "red" ? "Red" : "Blue"} fleet`,
                    ships: game.game.fleets[game.activePlayer],
                    shots: game.game.shots[game.activePlayer],
                    accent,
                  },
                  {
                    title: "Radar — fire here",
                    ships: null,
                    shots: game.game.shots[opponent],
                    onCellPress: game.fire,
                    accent,
                    highlight: sunkCells,
                  },
                ]}
              />
              <Text style={[styles.passNote, { color: theme.textSecondary }]}>
                Tap a square on your radar to fire. Hits show red, misses white.
                After your shot, hand the device over!
              </Text>
            </View>
          )}

          {isOver && (
            <View style={styles.phaseBlock}>
              <View style={styles.overBanner}>
                <Text style={[styles.overText, { color: theme.text }]}>{statusText}</Text>
              </View>
              <BattleshipCase
                logo="GAME OVER"
                panels={[
                  {
                    title: "Red fleet",
                    ships: game.game.fleets[0],
                    shots: game.game.shots[0],
                    accent: "red",
                  },
                  {
                    title: "Blue fleet",
                    ships: game.game.fleets[1],
                    shots: game.game.shots[1],
                    accent: "blue",
                  },
                ]}
              />
              <SketchyButton
                title="Play again"
                variant="primary"
                onPress={game.reset}
                style={styles.playAgain}
              />
            </View>
          )}
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
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    alignSelf: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: BorderRadius.large,
    borderWidth: 2,
    borderColor: "#D8DCE0",
    marginBottom: Spacing.five,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  phaseBlock: {
    gap: Spacing.five,
  },
  handoffCard: {
    alignItems: "center",
    gap: Spacing.four,
    paddingVertical: Spacing.seven,
    paddingHorizontal: Spacing.five,
    borderRadius: BorderRadius.medium,
    borderWidth: 3,
    borderStyle: "dashed",
  },
  handoffTitle: {
    fontFamily: Fonts.title,
    fontSize: FontSize.xxxl,
    lineHeight: FontSize.xxxl * 1.1,
  },
  handoffText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.4,
    textAlign: "center",
  },
  passButton: {
    minWidth: 180,
  },
  passNote: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.4,
    textAlign: "center",
  },
  overBanner: {
    paddingVertical: Spacing.three,
  },
  overText: {
    fontFamily: Fonts.title,
    fontSize: FontSize.xl,
    lineHeight: FontSize.xl * 1.2,
    textAlign: "center",
  },
  playAgain: {
    alignSelf: "center",
    minWidth: 180,
  },
});