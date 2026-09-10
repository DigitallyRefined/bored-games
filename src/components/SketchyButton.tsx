import React from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface SketchyButtonProps extends PressableProps {
  title: string;
  variant?: "primary" | "outline" | "ghost";
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
}

interface BtnStyle {
  backgroundColor: string;
  borderColor: string;
  color: string;
}

export function SketchyButton({
  title,
  variant = "primary",
  leftIcon,
  style,
  textStyle,
  pressedStyle,
  ...props
}: SketchyButtonProps) {
  const theme = useTheme();

  const getStyles = (): BtnStyle => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: theme.accent,
          borderColor: theme.accent,
          color: "#FFFFFF",
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderColor: "transparent",
          color: theme.accent,
        };
      default:
        return {
          backgroundColor: "transparent",
          borderColor: theme.border,
          color: theme.text,
        };
    }
  };

  const btnStyle = getStyles();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: btnStyle.backgroundColor },
        styles.outline,
        { borderColor: btnStyle.borderColor },
        pressed && [pressedStyle, styles.pressed],
        style,
      ]}
      {...props}
    >
      {({ pressed }) => (
        <>
          {pressed && (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  pointerEvents: "none",
                  backgroundColor: btnStyle.color + "14",
                  borderRadius: 6
                },
              ]}
            />
          )}
          <Text
            style={[
              styles.text,
              { color: btnStyle.color },
              pressed && styles.pressedText,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.two,
    borderWidth: 2,
    position: "relative",
  },
  outline: {
    transform: [{ rotate: "-0.5deg" }],
  },
  text: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * 1.3,
    letterSpacing: 0.3,
  },
  pressed: {
    transform: [{ rotate: "0deg" }, { translateY: 2 }],
  },
  pressedText: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
});
