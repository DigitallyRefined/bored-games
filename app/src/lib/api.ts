import { Platform } from "react-native";

// The default API WebSocket endpoint. Override via EXPO_PUBLIC_WS_URL env var.
// Defaults to localhost for dev (Android emulator reaches the host via
// 10.0.2.2). On a physical device, point this at your machine's LAN IP,
// e.g. ws://192.168.1.10:3001/ws
export const DEFAULT_WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ??
  (Platform.OS === "android" ? "ws://10.0.2.2:3001/ws" : "ws://localhost:3001/ws");

export const SHARED_AUTH_SECRET =
  process.env.EXPO_PUBLIC_AUTH_SECRET ?? "bored-games-shared-secret";

// Must match the shared key used by the API (api/src/auth.ts)
export function authTokenFor(username: string): string {
  return `${username}:${SHARED_AUTH_SECRET}`;
}