import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1B1B1F",
    textSecondary: "#6B6B70",
    background: "#FDFDFF",
    backgroundElement: "#EDEDF0",
    backgroundSelected: "#E3E3E8",
    accent: "#6C5CE7",
    accentLight: "#A29BFE",
    danger: "#FF6B6B",
    success: "#51CF66",
    warning: "#FCC419",
    border: "#39393D",
    borderLight: "#C4C4C7",
  },
  dark: {
    text: "#EDEDF0",
    textSecondary: "#94949A",
    background: "#1B1B1F",
    backgroundElement: "#2C2C30",
    backgroundSelected: "#3B3B40",
    accent: "#A29BFE",
    accentLight: "#6C5CE7",
    danger: "#FF8787",
    success: "#69DB7C",
    warning: "#FFE066",
    border: "#EDEDF0",
    borderLight: "#54545A",
  },
};

export const Fonts = Platform.select({
  ios: {
    hand: "PatrickHand_400Regular",
    title: "Caveat_400Regular",
  },
  android: {
    hand: "PatrickHand_400Regular",
    title: "Caveat_400Regular",
  },
  web: {
    hand: "PatrickHand_400Regular",
    title: "Caveat_400Regular",
  },
  default: {
    hand: "PatrickHand_400Regular",
    title: "Caveat_400Regular",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 28,
  eight: 32,
  ten: 40,
  twelve: 48,
  sixteen: 64,
};

export const BorderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  xlarge: 16,
  sketchy: 8,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  title: 40,
  hero: 48,
};
