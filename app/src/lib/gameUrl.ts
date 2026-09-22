import { Platform } from "react-native";
import Constants from "expo-constants";

const FALLBACK_ORIGIN = "https://digitallyrefined.github.io";

export function getBaseUrl(): string {
  const configured = Constants.expoConfig?.experiments?.baseUrl;
  if (configured && configured.trim() !== "") {
    return `/${configured.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  }
  return "/bored-games";
}

export function buildGamePageUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.origin
      : FALLBACK_ORIGIN;
  return `${origin}${getBaseUrl()}${normalizedPath}`;
}

export function buildRoomJoinUrl(path: string, code: string): string {
  return `${buildGamePageUrl(path)}?code=${encodeURIComponent(code)}`;
}