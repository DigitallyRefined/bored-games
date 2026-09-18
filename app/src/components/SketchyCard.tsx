import React from "react";
import { View, StyleSheet, type ViewProps } from "react-native";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface SketchyCardProps extends ViewProps {
  children: React.ReactNode;
  variant?: "default" | "filled" | "outlined";
}

export function SketchyCard({
  children,
  variant = "default",
  style,
  ...props
}: SketchyCardProps) {
  const theme = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case "filled":
        return theme.accent + "14";
      case "outlined":
        return "transparent";
      default:
        return theme.backgroundElement;
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: getBackgroundColor() }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.five,
    borderRadius: 4,
  },
});
