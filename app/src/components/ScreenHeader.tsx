import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { SettingsButton } from "@/components/SettingsButton";

interface ScreenHeaderProps {
  title: string;
  backTo?: Href;
  hideSettings?: boolean;
}

export function ScreenHeader({ title, backTo, hideSettings = false }: ScreenHeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={() => (backTo ? router.replace(backTo) : router.back())}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        hitSlop={10}
      >
        <Text style={[styles.backIcon, { color: theme.text }]}>←</Text>
      </Pressable>
      <Text style={[styles.screenTitle, { color: theme.text }]}>{title}</Text>
      {hideSettings ? (
        <View style={styles.backSpacer} />
      ) : (
        <SettingsButton style={styles.settingsButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.six,
  },
  backButton: {
    padding: Spacing.two,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  backIcon: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.xxl,
    lineHeight: FontSize.xxl * 1.1,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.7,
  },
  backSpacer: {
    width: 34,
  },
  settingsButton: {
    width: 34,
    alignItems: "center",
  },
  screenTitle: {
    fontFamily: Fonts.title,
    fontSize: FontSize.xxxl,
    lineHeight: FontSize.xxxl * 1.1,
  },
});