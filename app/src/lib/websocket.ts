import { useEffect, useState } from "react";

import { getOrCreateAuth, saveUserId } from "@/lib/auth";
import type { ClientMessage, ServerMessage } from "@/lib/protocol";
import { getWsUrl, loadWsUrl } from "@/lib/settings";

export type SocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (status: SocketStatus) => void;
type FailureHandler = () => void;

const MAX_RECONNECT_DELAY = 10_000;
const KEEP_ALIVE_INTERVAL = 25_000;

class GameConnection {
  private ws: WebSocket | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private failureHandlers = new Set<FailureHandler>();
  private status: SocketStatus = "idle";
  private reconnectDelay = 1_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private closedByUser = false;
  private everConnected = false;
  private userId: string | null = null;
  private username: string | null = null;

  subscribe(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  // Fires when a connection attempt that never reached "connected" fails,
  // e.g. after the user tries to create/join while the server is unreachable.
  onConnectionFailed(handler: FailureHandler): () => void {
    this.failureHandlers.add(handler);
    return () => this.failureHandlers.delete(handler);
  }

  getStatus(): SocketStatus {
    return this.status;
  }

  getUserId(): string | null {
    return this.userId;
  }

  getUsername(): string | null {
    return this.username;
  }

  connect(): void {
    this.closedByUser = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    if (this.status === "connecting") return;
    this.setStatus("connecting");
    this.openSocket();
  }

  disconnect(): void {
    this.closedByUser = true;
    this.everConnected = false;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
    this.setStatus("idle");
  }

  send(msg: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  private openSocket(): void {
    const ws = new WebSocket(getWsUrl());
    this.ws = ws;

    ws.onopen = () => {
      this.everConnected = true;
      this.setStatus("connected");
      this.reconnectDelay = 1_000;
      this.startKeepAlive();
      void this.authenticate();
    };

    ws.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(event.data)) as ServerMessage;
      } catch {
        return;
      }
      this.handleServerMessage(msg);
    };

    ws.onerror = () => {
      // onclose will follow
    };

    ws.onclose = () => {
      this.stopKeepAlive();
      if (this.closedByUser) {
        this.everConnected = false;
        this.ws = null;
        this.setStatus("idle");
        return;
      }
      this.ws = null;
      if (this.everConnected) {
        // We've been connected before, so treat this as a transient drop and
        // keep the current session alive while we retry.
        this.scheduleReconnect();
      } else {
        // The initial connection never succeeded (e.g. server unreachable).
        // Stop retrying and notify listeners so the app can guide the user.
        this.setStatus("error");
        const handlers = Array.from(this.failureHandlers);
        handlers.forEach((handler) => handler());
      }
    };
  }

  private scheduleReconnect(): void {
    this.setStatus("reconnecting");
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private async authenticate(): Promise<void> {
    const auth = await getOrCreateAuth();
    this.username = auth.username;
    this.emit({
      type: "auth",
      username: auth.username,
      token: auth.token,
    });
  }

  private handleServerMessage(msg: ServerMessage): void {
    if (msg.type === "auth_ok") {
      this.userId = msg.userId;
      this.username = msg.username;
      void saveUserId(msg.userId);
    }
    this.messageHandlers.forEach((handler) => handler(msg));
  }

  private emit(msg: ClientMessage): void {
    this.send(msg);
  }

  private setStatus(status: SocketStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, KEEP_ALIVE_INTERVAL);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private clearTimers(): void {
    this.stopKeepAlive();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const gameSocket = new GameConnection();

// Load any saved WebSocket URL before the first connection attempt.
void loadWsUrl();

export function useSocketStatus(): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>(gameSocket.getStatus());
  useEffect(() => gameSocket.onStatusChange(setStatus), []);
  return status;
}

export function useSocketMessages(handler: MessageHandler): void {
  useEffect(() => gameSocket.subscribe(handler), [handler]);
}

export function useSocketUser(): { userId: string | null; username: string | null } {
  const [, force] = useState(0);
  useSocketMessages((msg) => {
    if (msg.type === "auth_ok") force((n) => n + 1);
  });
  return { userId: gameSocket.getUserId(), username: gameSocket.getUsername() };
}