import { serve, type ServerWebSocket } from "bun";
import { initDb, sql } from "./db";
import {
  onSocketClose,
  onSocketMessage,
  onSocketOpen,
  setBroadcaster,
  type WsData,
} from "./handlers";

const PORT = Number(process.env.PORT || 3001);

export const server = serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const success = server.upgrade(req, {
        data: { userId: null, username: null, roomId: null },
      });
      if (success) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    if (url.pathname === "/health") {
      return new Response("ok");
    }
    return new Response("Bored Games API", { status: 200 });
  },
  websocket: {
    open(ws: ServerWebSocket<WsData>) {
      void onSocketOpen(ws);
    },
    message(ws: ServerWebSocket<WsData>, message: string | Buffer) {
      void onSocketMessage(ws, message);
    },
    close(ws: ServerWebSocket<WsData>, _code: number, _reason: string) {
      void onSocketClose(ws);
    },
  },
});

setBroadcaster(server);

(async () => {
  try {
    await initDb();
    console.log(`[server] listening on ws://localhost:${PORT}/ws`);
    void sql`SELECT 1`;
  } catch (err) {
    console.error("[server] failed to initialize:", err);
    process.exit(1);
  }
})();