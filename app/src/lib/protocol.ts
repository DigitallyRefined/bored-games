// Client -> server messages
export type ClientMessage =
  | { type: "auth"; username: string; token: string }
  | { type: "create_room"; gameType: string }
  | { type: "join_room"; code: string; gameType: string }
  | { type: "move"; roomId: string; moveData: unknown }
  | { type: "leave_room" }
  | { type: "ping" };

// Server -> client messages
export type ServerMessage =
  | { type: "auth_ok"; username: string; userId: string }
  | { type: "auth_fail"; reason: string }
  | { type: "room_created"; roomId: string; code: string; playerIndex: number; symbol: string }
  | { type: "room_joined"; roomId: string; code: string; playerIndex: number; symbol: string }
  | {
      type: "waiting";
      roomId: string;
      code: string;
      currentPlayerCount: number;
      requiredPlayerCount: number;
    }
  | {
      type: "player_joined";
      roomId: string;
      username: string;
      currentPlayerCount: number;
      requiredPlayerCount: number;
    }
  | {
      type: "game_start";
      roomId: string;
      players: {
        userId: string;
        username: string;
        playerIndex: number;
        symbol: string;
      }[];
      gameState: unknown;
      currentTurnUserId: string;
    }
  | {
      type: "opponent_move";
      roomId: string;
      playerId: string;
      playerIndex: number;
      moveData: unknown;
      gameState: unknown;
      currentTurnUserId: string;
    }
  | {
      type: "game_over";
      roomId: string;
      winnerIndex: number | null;
      isDraw: boolean;
      gameState: unknown;
    }
  | { type: "player_left"; roomId: string; username: string }
  | { type: "opponent_disconnected"; roomId: string; username: string }
  | { type: "pong" }
  | { type: "error"; message: string };