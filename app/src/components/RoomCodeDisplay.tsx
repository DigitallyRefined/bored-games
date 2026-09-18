import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface RoomCodeDisplayProps {
  code: string;
}

export function RoomCodeDisplay({ code }: RoomCodeDisplayProps) {
  const theme = useTheme();
  const parts = code.split("-").filter(Boolean);

  return (
    <View style={styles.container}>
      {parts.map((part, index) => (
        <React.Fragment key={`${part}-${index}`}>
          {index > 0 && <Text style={[styles.dash, { color: theme.borderLight }]}>-</Text>}
          <View style={[styles.part, { backgroundColor: theme.backgroundElement, borderColor: theme.borderLight }]}>
            <Text style={[styles.partText, { color: theme.text }]}>{part}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  dash: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.xxl,
    lineHeight: FontSize.xxl * 1.1,
  },
  part: {
    borderWidth: 2,
    borderRadius: 6,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    transform: [{ rotate: "-1deg" }],
  },
  partText: {
    fontFamily: Fonts.title,
    fontSize: FontSize.xxxl,
    lineHeight: FontSize.xxxl * 1.1,
  },
});