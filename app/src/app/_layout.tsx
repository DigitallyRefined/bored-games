import React, { useCallback, useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { View, StyleSheet } from "react-native";
import { PatrickHand_400Regular } from "@expo-google-fonts/patrick-hand";
import { Caveat_400Regular } from "@expo-google-fonts/caveat";

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PatrickHand_400Regular,
    Caveat_400Regular,
  });

  const hideSplash = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    void hideSplash();
  }, [hideSplash]);

  if (!fontsLoaded) {
    return <View style={styles.loading} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#FDFDFF",
  },
});