import React from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BorderRadius, Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function ChessIndexScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ScreenHeader title="Chess" backTo="/" />

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Check, castle, and chase the enemy king across the wooden board. Pick a way to play.
          </Text>

          <View style={styles.modeList}>
            <Pressable
              onPress={() => router.push("/games/chess/local")}
              style={({ pressed }) => [
                styles.modeCard,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.modeCardPressed,
              ]}
            >
              <View style={[styles.modeBadge, { backgroundColor: theme.accent + "1a" }]}>
                <Text style={[styles.modeBadgeText, { color: theme.accent }]}>Local</Text>
              </View>
              <Text style={[styles.modeTitle, { color: theme.text }]}>Play locally</Text>
              <Text style={[styles.modeDescription, { color: theme.textSecondary }]}>
                Pass the device back and forth with a friend.
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/games/chess/online")}
              style={({ pressed }) => [
                styles.modeCard,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.modeCardPressed,
              ]}
            >
              <View style={[styles.modeBadge, { backgroundColor: theme.accent + "1a" }]}>
                <Text style={[styles.modeBadgeText, { color: theme.accent }]}>Online</Text>
              </View>
              <Text style={[styles.modeTitle, { color: theme.text }]}>Play online</Text>
              <Text style={[styles.modeDescription, { color: theme.textSecondary }]}>
                Create a room and face a friend over the internet.
              </Text>
            </Pressable>
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
  subtitle: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * 1.4,
    marginBottom: Spacing.six,
  },
  modeList: {
    gap: Spacing.four,
  },
  modeCard: {
    padding: Spacing.six,
    borderRadius: BorderRadius.medium,
    borderWidth: 2,
    borderColor: "transparent",
  },
  modeCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  modeBadge: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    marginBottom: Spacing.three,
  },
  modeBadgeText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  modeTitle: {
    fontFamily: Fonts.title,
    fontSize: FontSize.xxl,
    lineHeight: FontSize.xxl * 1.1,
    marginBottom: Spacing.one,
  },
  modeDescription: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.4,
  },
});