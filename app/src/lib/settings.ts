import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_WS_URL } from "@/lib/api";

const WS_URL_STORAGE_KEY = "bored-games:wsUrl";

let storedWsUrl: string | null = null;
let loaded = false;

// Accept bare hostnames ("192.168.1.10:3001"), http(s) URIs and ws(s) URIs.
// Missing ws(s):// scheme is inferred; http(s) maps to ws(s). A URL without a
// path gets the bundled server's "/ws" endpoint appended.
export function normalizeWsUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_WS_URL;

  let url = trimmed;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url)) {
    url = `ws://${url}`;
  } else if (/^http:\/\//.test(url)) {
    url = url.replace(/^http:/, "ws:");
  } else if (/^https:\/\//.test(url)) {
    url = url.replace(/^https:/, "wss:");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") return null;
  if (!parsed.hostname) return null;

  if (!parsed.pathname || parsed.pathname === "/") {
    parsed.pathname = "/ws";
  }
  return parsed.toString();
}

// The currently configured WebSocket URL, falling back to the default.
export function getWsUrl(): string {
  return storedWsUrl ?? DEFAULT_WS_URL;
}

export async function loadWsUrl(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const url = await AsyncStorage.getItem(WS_URL_STORAGE_KEY);
    if (url) {
      const normalized = normalizeWsUrl(url);
      if (normalized) {
        storedWsUrl = normalized === DEFAULT_WS_URL ? null : normalized;
      }
    }
  } catch {
    // Ignore storage errors and fall back to the default URL.
  }
}

// Saves the given URL and returns its normalized form, or null when invalid.
// Passing the built-in default clears the override.
export async function saveWsUrl(input: string): Promise<string | null> {
  const normalized = normalizeWsUrl(input);
  if (!normalized) return null;
  storedWsUrl = normalized === DEFAULT_WS_URL ? null : normalized;
  try {
    if (storedWsUrl === null) {
      await AsyncStorage.removeItem(WS_URL_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(WS_URL_STORAGE_KEY, storedWsUrl);
    }
  } catch {
    // Non-fatal: URL still applies for this session.
  }
  return normalized;
}

export async function resetWsUrl(): Promise<string> {
  storedWsUrl = null;
  try {
    await AsyncStorage.removeItem(WS_URL_STORAGE_KEY);
  } catch {
    // Non-fatal.
  }
  return DEFAULT_WS_URL;
}