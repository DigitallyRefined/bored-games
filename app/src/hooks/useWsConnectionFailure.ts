import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";

import { gameSocket } from "@/lib/websocket";

const SETTINGS_HREF = "/settings?wsError=1";

/**
 * Redirects to the settings screen when the websocket cannot be reached.
 * The socket is only ever opened in response to a create/join action, so a
 * failed connection here means the server is unavailable. Used by every
 * "play online" screen so an unreachable server is surfaced to the user
 * instead of being silently retried forever.
 */
export function useWsConnectionFailureRedirect(): void {
  const router = useRouter();
  const redirectedRef = useRef(false);

  useEffect(() => {
    redirectedRef.current = false;
    return gameSocket.onConnectionFailed(() => {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      router.replace(SETTINGS_HREF);
    });
  }, [router]);
}