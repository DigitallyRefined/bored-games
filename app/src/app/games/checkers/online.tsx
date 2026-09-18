import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SketchyButton } from "@/components/SketchyButton";
import { SketchyCard } from "@/components/SketchyCard";
import { RoomCodeDisplay } from "@/components/RoomCodeDisplay";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { useOnlineCheckers } from "@/hooks/useOnlineCheckers";

export default function CheckersOnlineScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { game, createRoom, joinRoom, leaveRoom } = useOnlineCheckers();
  const [roomCodeInput, setRoomCodeInput] = useState("");

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      leaveRoom();
    });
    return unsubscribe;
  }, [navigation, leaveRoom]);

  useEffect(() => {
    if (game.phase === "playing" || game.phase === "gameOver") {
      router.push("/games/checkers/play-online");
    }
  }, [game.phase, router]);

  const isWaiting = game.phase === "waiting";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ScreenHeader title="Play online" backTo="/games/checkers" />

          {game.error && (
            <SketchyCard variant="outlined" style={[styles.errorCard, { borderColor: theme.danger }]}>
              <Text style={[styles.errorText, { color: theme.danger }]}>{game.error}</Text>
            </SketchyCard>
          )}

          {isWaiting ? (
            <View style={styles.waitingBlock}>
              <Text style={[styles.waitingLabel, { color: theme.textSecondary }]}>
                Share this room code
              </Text>
              {game.code && <RoomCodeDisplay code={game.code} />}
              <CopyCodeButton code={game.code} style={styles.copyButton} />
              <Text style={[styles.waitingText, { color: theme.textSecondary }]}>
                {game.statusMessage}
              </Text>
              {game.waitingCounts && (
                <Text style={[styles.waitingText, { color: theme.textSecondary }]}>
                  {game.waitingCounts.current} / {game.waitingCounts.required} players
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.lobbyBlock}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Create a room</Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Get a room code to share with a friend, then wait for them to join.
              </Text>
              <SketchyButton
                title="Create room"
                variant="primary"
                onPress={createRoom}
                style={styles.actionButton}
              />

              <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

              <Text style={[styles.sectionTitle, { color: theme.text }]}>Join a room</Text>
              <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
                Enter the room code your friend shared with you.
              </Text>
              <TextInput
                value={roomCodeInput}
                onChangeText={setRoomCodeInput}
                placeholder="mango-robin-zebra"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.borderLight,
                    color: theme.text,
                  },
                ]}
              />
              <SketchyButton
                title="Join room"
                variant="outline"
                onPress={() => joinRoom(roomCodeInput)}
                style={styles.actionButton}
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
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: Spacing.five,
  },
  errorCard: {
    marginBottom: Spacing.five,
  },
  errorText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.4,
  },
  lobbyBlock: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontFamily: Fonts.title,
    fontSize: FontSize.xxl,
    lineHeight: FontSize.xxl * 1.1,
  },
  sectionDescription: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.4,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.four,
  },
  actionButton: {
    alignSelf: "flex-start",
    minWidth: 160,
  },
  input: {
    borderWidth: 2,
    borderRadius: 6,
    fontFamily: Fonts.hand,
    fontSize: FontSize.lg,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  waitingBlock: {
    alignItems: "center",
    gap: Spacing.five,
    paddingVertical: Spacing.six,
  },
  waitingLabel: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
  },
  waitingText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.lg,
    textAlign: "center",
  },
  copyButton: {
    minWidth: 160,
  },
});