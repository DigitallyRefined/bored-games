import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { Link, type Href } from "expo-router";
import { SketchyCard } from "@/components/SketchyCard";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

export interface GameInfo {
  slug: string;
  name: string;
  description: string;
  href: Href;
  preview: React.ReactNode;
}

interface GameCardProps {
  game: GameInfo;
}

export function GameCard({ game }: GameCardProps) {
  const theme = useTheme();

  return (
    <Link href={game.href} asChild>
      <Pressable style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
        <SketchyCard variant="default" style={styles.card}>
          <View style={styles.content}>
            <View style={[styles.previewContainer, { backgroundColor: theme.accent + "10" }]}>
              {game.preview}
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: theme.text }]}>{game.name}</Text>
              <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
                {game.description}
              </Text>
              <View style={styles.ctaRow}>
                <Text style={[styles.play, { color: theme.accent }]}>Play now</Text>
                <Text style={[styles.arrow, { color: theme.accent }]}>→</Text>
              </View>
            </View>
          </View>
        </SketchyCard>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  card: {
    padding: Spacing.five,
    textAlign: "left",
  },
  content: {
    flexDirection: "row",
    gap: Spacing.four,
    alignItems: "stretch",
    height: 96,
    overflow: "hidden",
    position: "relative",
    zIndex: 1,
  },
  previewContainer: {
    width: 88,
    height: 88,
    alignSelf: "center",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  info: {
    flex: 1,
    justifyContent: "center",
    position: "relative",
    zIndex: 1,
  },
  name: {
    fontFamily: Fonts.title,
    fontSize: FontSize.xxl,
    lineHeight: FontSize.xxl * 1.1,
  },
  description: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: 19,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  play: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  arrow: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.lg,
  },
});
