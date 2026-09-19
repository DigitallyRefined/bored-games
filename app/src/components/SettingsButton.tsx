import React from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface SettingsButtonProps {
  style?: StyleProp<ViewStyle>;
  size?: number;
}

export function SettingsButton({ style, size = FontSize.xxl }: SettingsButtonProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/settings")}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Settings"
    >
      <Text style={[styles.icon, { color: theme.text, fontSize: size }]}>⚙︎</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.two,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  icon: {
    lineHeight: FontSize.xxl * 1.1,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.7,
  },
});