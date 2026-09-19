import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts, FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SketchyButton } from "@/components/SketchyButton";
import { SketchyCard } from "@/components/SketchyCard";
import { getWsUrl, loadWsUrl, resetWsUrl, saveWsUrl } from "@/lib/settings";
import { gameSocket, useSocketStatus, type SocketStatus } from "@/lib/websocket";

function statusLabel(
  status: SocketStatus
): { text: string; color: "success" | "warning" | "danger" } | null {
  switch (status) {
    case "connected":
      return { text: "Connected", color: "success" };
    case "connecting":
      return { text: "Connecting…", color: "warning" };
    case "reconnecting":
      return { text: "Reconnecting…", color: "warning" };
    case "error":
      return { text: "Server not available", color: "danger" };
    default:
      return null;
  }
}

export default function SettingsScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const params = useLocalSearchParams<{ wsError?: string }>();
  const socketStatus = useSocketStatus();
  const [value, setValue] = useState(() => getWsUrl());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const touchedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void loadWsUrl().then(() => {
      if (active && !touchedRef.current) {
        setValue(getWsUrl());
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const apply = useCallback(async (nextUrl: string) => {
    setJustSaved(false);
    gameSocket.disconnect();
    gameSocket.connect();
    setValue(nextUrl);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }, []);

  const handleSave = useCallback(async () => {
    const normalized = await saveWsUrl(value);
    if (!normalized) {
      setValidationError(
        "That doesn't look like a valid address. Try “hostname:3001”, “ws://host/ws” or “wss://host/ws”."
      );
      return;
    }
    setValidationError(null);
    void apply(normalized);
  }, [value, apply]);

  const handleReset = useCallback(async () => {
    setValidationError(null);
    const nextUrl = await resetWsUrl();
    void apply(nextUrl);
  }, [apply]);

  const showUnavailable = params.wsError === "1" && socketStatus !== "connected";
  const status = statusLabel(socketStatus);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ScreenHeader title="Settings" backTo="/" hideSettings />

          {showUnavailable && (
            <SketchyCard variant="outlined" style={[styles.errorCard, { borderColor: theme.danger }]}>
              <Text style={[styles.errorTitle, { color: theme.danger }]}>
                WebSocket server not available
              </Text>
              <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                We could not reach the websocket server. Enter the hostname or URI of the websocket
                server you want to use below. If you need one, you can self-host it yourself — see
                the note at the bottom of this page.
              </Text>
            </SketchyCard>
          )}

          <Text style={[styles.sectionTitle, { color: theme.text }]}>WebSocket server</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            The app talks to a small websocket server to play online. Point it at any compatible
            server you trust.
          </Text>

          <TextInput
            value={value}
            onChangeText={(text) => {
              touchedRef.current = true;
              setValue(text);
            }}
            placeholder="ws://hostname:3001/ws"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: validationError ? theme.danger : theme.borderLight,
                color: theme.text,
              },
            ]}
          />

          {validationError && (
            <Text style={[styles.inlineError, { color: theme.danger }]}>{validationError}</Text>
          )}

          <View style={styles.buttonRow}>
            <SketchyButton
              title="Save & connect"
              variant="primary"
              onPress={handleSave}
              style={styles.saveButton}
            />
            <SketchyButton
              title="Reset to default"
              variant="ghost"
              onPress={handleReset}
              style={styles.resetButton}
            />
          </View>

          {status && (
            <View style={styles.statusRow}>
              <View
                style={[styles.statusDot, { backgroundColor: theme[status.color] }]}
              />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                {status.text}
              </Text>
            </View>
          )}
          {justSaved && (
            <Text style={[styles.savedText, { color: theme.success }]}>
              Saved — testing connection
            </Text>
          )}

          <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Self-hosting</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            No server handy? No problem. The bundled server lives in the api/ folder of the{" "}
            <Link
              href="https://github.com/DigitallyRefined/bored-games"
              style={[styles.link, { color: theme.accent }]}
            >
              bored-games repository
            </Link>{" "}
            and runs anywhere Bun runs — just install and run it, then point this setting at your own
            server. Only two players matching a room code ever need to reach it.
          </Text>
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
    gap: Spacing.three,
  },
  errorCard: {
    marginBottom: Spacing.three,
  },
  errorTitle: {
    fontFamily: Fonts.title,
    fontSize: FontSize.xxl,
    lineHeight: FontSize.xxl * 1.1,
    marginBottom: Spacing.two,
  },
  errorText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.4,
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
  link: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
    textDecorationLine: "underline",
  },
  input: {
    borderWidth: 2,
    borderRadius: 6,
    fontFamily: Fonts.hand,
    fontSize: FontSize.lg,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  inlineError: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  saveButton: {
    minWidth: 160,
  },
  resetButton: {
    minWidth: 140,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
  },
  savedText: {
    fontFamily: Fonts.hand,
    fontSize: FontSize.md,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.two,
  },
});