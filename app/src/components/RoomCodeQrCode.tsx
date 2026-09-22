import React from "react";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { buildRoomJoinUrl } from "@/lib/gameUrl";

interface RoomCodeQrCodeProps {
  code: string;
  path: string;
}

export function RoomCodeQrCode({ code, path }: RoomCodeQrCodeProps) {
  const theme = useTheme();
  const url = buildRoomJoinUrl(path, code);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.borderLight }]}>
      <QRCode
        value={url}
        size={180}
        color="#1B1B1F"
        backgroundColor="#FFFFFF"
        quietZone={4}
      />
      <Text style={[styles.caption, { color: theme.textSecondary }]}>
        Scan to join this room
      </Text>
      <Text style={[styles.url, { color: theme.textSecondary }]} numberOfLines={2}>
        {url}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.four,
    borderWidth: 2,
    borderRadius: 8,
    transform: [{ rotate: "-0.5deg" }],
  },
  caption: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.4,
  },
  url: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * 1.4,
    textAlign: "center",
  },
});