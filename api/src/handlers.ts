import type { ServerWebSocket } from "bun";
import { sql, type Room, type RoomPlayer, type User } from "./db";
import { generateRoomCode, generateToken, verifyToken } from "./auth";
import { getGameEngine } from "./games";

type Message = Record<string, any>;

function send(ws: ServerWebSocket<WsData>, payload: Record<string, any>): void {
  ws.send(JSON.stringify(payload));
}

function sendError(ws: ServerWebSocket<WsData>, message: string): void {
  send(ws, { type: "error", message });
}

export interface WsData {
  userId: string | null;
  username: string | null;
  roomId: string | null;
}

async function getUserByToken(token: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM users WHERE auth_token = ${token}`;
  return rows.length > 0 ? (rows[0] as User) : null;
}

async function getUserById(userId: string): Promise<User | null> {
  const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
  return rows.length > 0 ? (rows[0] as User) : null;
}

async function getRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
  return (await sql`
    SELECT rp.*, u.username
    FROM room_players rp
    JOIN users u ON u.id = rp.user_id
    WHERE rp.room_id = ${roomId}
    ORDER BY rp.player_index
  `) as RoomPlayer[];
}

async function getRoom(roomId: string): Promise<Room | null> {
  const rows = await sql`SELECT * FROM rooms WHERE id = ${roomId}`;
  return rows.length > 0 ? (rows[0] as Room) : null;
}

function roomTopic(roomId: string): string {
  return `room:${roomId}`;
}

interface Broadcaster {
  publish(topic: string, data: string | Buffer): number;
}

let broadcaster: Broadcaster | null = null;

export function setBroadcaster(b: Broadcaster): void {
  broadcaster = b;
}

function broadcastToRoom(roomId: string, payload: Record<string, any>): void {
  broadcaster?.publish(roomTopic(roomId), JSON.stringify(payload));
}

export async function onSocketOpen(ws: ServerWebSocket<WsData>): Promise<void> {
  ws.data = { userId: null, username: null, roomId: null };
}

export async function onSocketMessage(
  ws: ServerWebSocket<WsData>,
  rawMessage: string | Buffer
): Promise<void> {
  let msg: Message;
  try {
    msg = JSON.parse(String(rawMessage));
  } catch {
    sendError(ws, "Invalid JSON message");
    return;
  }

  switch (msg.type) {
    case "auth":
      await handleAuth(ws, msg);
      break;
    case "create_room":
      await handleCreateRoom(ws, msg);
      break;
    case "join_room":
      await handleJoinRoom(ws, msg);
      break;
    case "move":
      await handleMove(ws, msg);
      break;
    case "leave_room":
      await handleLeaveRoom(ws);
      break;
    case "ping":
      send(ws, { type: "pong" });
      break;
    default:
      sendError(ws, `Unknown message type: ${msg.type}`);
  }
}

export async function onSocketClose(ws: ServerWebSocket<WsData>): Promise<void> {
  await handleDisconnect(ws);
}

async function handleAuth(ws: ServerWebSocket<WsData>, msg: Message): Promise<void> {
  const { token, username } = msg;
  if (typeof token !== "string" || typeof username !== "string") {
    sendError(ws, "auth requires token and username");
    return;
  }

  if (!verifyToken(username, token)) {
    send(ws, { type: "auth_fail", reason: "Invalid credentials" });
    return;
  }

  let user = await getUserByToken(token);
  if (!user) {
    const [created] = await sql`
      INSERT INTO users ${sql({ username, auth_token: token })}
      ON CONFLICT (auth_token) DO NOTHING
      RETURNING *
    `;
    user = created;
  }
  if (!user) {
    sendError(ws, "Could not create user");
    return;
  }

  ws.data.userId = user.id;
  ws.data.username = user.username;
  send(ws, { type: "auth_ok", username: user.username, userId: user.id });
}

async function handleCreateRoom(ws: ServerWebSocket<WsData>, msg: Message): Promise<void> {
  if (!ws.data.userId) {
    sendError(ws, "Not authenticated");
    return;
  }

  const { gameType } = msg;
  if (typeof gameType !== "string") {
    sendError(ws, "gameType is required");
    return;
  }

  const engine = getGameEngine(gameType);
  if (!engine) {
    sendError(ws, `Unknown game type: ${gameType}`);
    return;
  }

  let code = generateRoomCode();
  // Ensure uniqueness
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await sql`SELECT id FROM rooms WHERE code = ${code}`;
    if (existing.length === 0) break;
    code = generateRoomCode();
  }

  const userId = ws.data.userId;
  const [room] = await sql`
    INSERT INTO rooms ${sql({ code, game_type: gameType, state: {}, status: "waiting" })}
    RETURNING *
  `;

  const [player] = await sql`
    INSERT INTO room_players ${sql({
      room_id: room.id,
      user_id: userId,
      player_index: 0,
      symbol: engine.getPlayerSymbol(0),
    })}
    RETURNING *
  `;

  ws.data.roomId = room.id;
  ws.subscribe(roomTopic(room.id));

  send(ws, {
    type: "room_created",
    roomId: room.id,
    code,
    playerIndex: player.player_index,
    symbol: player.symbol,
  });
  send(ws, {
    type: "waiting",
    roomId: room.id,
    code,
    currentPlayerCount: 1,
    requiredPlayerCount: engine.playerCount.min,
  });
}

async function handleJoinRoom(ws: ServerWebSocket<WsData>, msg: Message): Promise<void> {
  if (!ws.data.userId) {
    sendError(ws, "Not authenticated");
    return;
  }

  const { code } = msg;
  if (typeof code !== "string") {
    sendError(ws, "code is required");
    return;
  }

  const normalized = code.trim().toLowerCase();
  const rooms = await sql`SELECT * FROM rooms WHERE code = ${normalized}`;
  if (rooms.length === 0) {
    sendError(ws, "Room not found");
    return;
  }

  const room = rooms[0] as Room;
  if (room.status !== "waiting") {
    sendError(ws, "Room is not accepting players");
    return;
  }

  const engine = getGameEngine(room.game_type);
  if (!engine) {
    sendError(ws, "Room has an unknown game type");
    return;
  }

  const userId = ws.data.userId;
  const members = await getRoomPlayers(room.id);
  const alreadyIn = members.some((m) => m.user_id === userId);
  if (alreadyIn) {
    sendError(ws, "You are already in this room");
    return;
  }

  if (members.length >= engine.playerCount.max) {
    sendError(ws, "Room is full");
    return;
  }

  const playerIndex = members.length;
  const [player] = await sql`
    INSERT INTO room_players ${sql({
      room_id: room.id,
      user_id: userId,
      player_index: playerIndex,
      symbol: engine.getPlayerSymbol(playerIndex),
    })}
    RETURNING *
  `;

  ws.data.roomId = room.id;
  ws.subscribe(roomTopic(room.id));

  send(ws, {
    type: "room_joined",
    roomId: room.id,
    code: room.code,
    playerIndex: player.player_index,
    symbol: player.symbol,
  });

  const updatedMembers = await getRoomPlayers(room.id);
  const managedByEngine = updatedMembers.length >= engine.playerCount.min;

  if (managedByEngine) {
    // Start the game
    const initialState = engine.createInitialState(updatedMembers.length);
    const [updated] = await sql`
      UPDATE rooms
      SET state = ${sql.unsafe(`'${JSON.stringify(initialState).replaceAll("'", "''")}'::jsonb`)},
          status = 'active',
          current_turn = ${updatedMembers[0].user_id}
      WHERE id = ${room.id}
      RETURNING *
    `;

    const playersPayload = updatedMembers.map((m) => ({
      userId: m.user_id,
      username: m.username,
      playerIndex: m.player_index,
      symbol: m.symbol,
    }));

    const broadcastPayload = {
      type: "game_start",
      roomId: room.id,
      players: playersPayload,
      gameState: engine.getPublicState(updated.state),
      currentTurnUserId: updated.current_turn,
    };

    broadcastToRoom(room.id, broadcastPayload);
  } else {
    // Still waiting for more players
    const payload = {
      type: "player_joined",
      roomId: room.id,
      username: ws.data.username,
      currentPlayerCount: updatedMembers.length,
      requiredPlayerCount: engine.playerCount.min,
    };
    broadcastToRoom(room.id, payload);
    send(ws, {
      type: "waiting",
      roomId: room.id,
      code: room.code,
      currentPlayerCount: updatedMembers.length,
      requiredPlayerCount: engine.playerCount.min,
    });
  }
}

async function handleMove(ws: ServerWebSocket<WsData>, msg: Message): Promise<void> {
  const userId = ws.data.userId;
  if (!userId) {
    sendError(ws, "Not authenticated");
    return;
  }

  const { roomId, moveData } = msg;
  if (typeof roomId !== "string") {
    sendError(ws, "roomId is required");
    return;
  }

  const room = await getRoom(roomId);
  if (!room) {
    sendError(ws, "Room not found");
    return;
  }

  if (room.status !== "active") {
    sendError(ws, "Game is not active");
    return;
  }

  if (room.current_turn !== userId) {
    sendError(ws, "Not your turn");
    return;
  }

  const engine = getGameEngine(room.game_type);
  if (!engine) {
    sendError(ws, "Unknown game type");
    return;
  }

  const player = await sql`
    SELECT * FROM room_players WHERE room_id = ${roomId} AND user_id = ${userId}
  `;
  if (player.length === 0) {
    sendError(ws, "You are not in this room");
    return;
  }

  const playerIndex = (player[0] as RoomPlayer).player_index;

  if (!engine.validateMove(room.state, moveData, playerIndex)) {
    sendError(ws, "Invalid move");
    return;
  }

  const members = await getRoomPlayers(roomId);
  const newState = engine.applyMove(room.state, moveData, playerIndex, members.length);
  const gameOver = engine.checkGameOver(newState);

  await sql`
    INSERT INTO moves ${sql({
      room_id: roomId,
      player_id: userId,
      player_index: playerIndex,
      move_data: moveData,
    })}
  `;

  if (gameOver) {
    const winnerId = gameOver.winnerIndex !== null
      ? (await sql`SELECT user_id FROM room_players WHERE room_id = ${roomId} AND player_index = ${gameOver.winnerIndex}`)[0]?.user_id
      : null;

    const [updated] = await sql`
      UPDATE rooms
      SET state = ${sql.unsafe(`'${JSON.stringify(newState).replaceAll("'", "''")}'::jsonb`)},
          status = 'finished',
          winner_id = ${winnerId ?? null}
      WHERE id = ${roomId}
      RETURNING *
    `;

    broadcastToRoom(roomId, {
      type: "game_over",
      roomId,
      winnerIndex: gameOver.winnerIndex,
      isDraw: gameOver.isDraw,
      gameState: engine.getPublicState(updated.state),
    });
    return;
  }

  const nextPlayerIndex = newState.currentPlayerIndex;
  const nextPlayerId = members.find((m) => m.player_index === nextPlayerIndex)?.user_id ?? null;

  const [updated] = await sql`
    UPDATE rooms
    SET state = ${sql.unsafe(`'${JSON.stringify(newState).replaceAll("'", "''")}'::jsonb`)},
        current_turn = ${nextPlayerId}
    WHERE id = ${roomId}
    RETURNING *
  `;

  broadcastToRoom(roomId, {
    type: "opponent_move",
    roomId,
    playerId: userId,
    playerIndex,
    moveData,
    gameState: engine.getPublicState(updated.state),
    currentTurnUserId: nextPlayerId,
  });
}

async function handleLeaveRoom(ws: ServerWebSocket<WsData>): Promise<void> {
  await handleDisconnect(ws);
}

async function handleDisconnect(ws: ServerWebSocket<WsData>): Promise<void> {
  const { userId, roomId } = ws.data;
  if (!userId || !roomId) return;

  const room = await getRoom(roomId);
  if (!room) {
    ws.data.roomId = null;
    return;
  }

  if (room.status === "waiting") {
    // Remove player from waiting room
    await sql`
      DELETE FROM room_players WHERE room_id = ${roomId} AND user_id = ${userId}
    `;
    const remaining = await sql`SELECT COUNT(*)::int AS count FROM room_players WHERE room_id = ${roomId} AND user_id IS NOT NULL`;
    if (remaining.length === 0 || Number(remaining[0].count) === 0) {
      await sql`DELETE FROM rooms WHERE id = ${roomId}`;
    } else {
      broadcastToRoom(roomId, {
        type: "player_left",
        roomId,
        username: ws.data.username,
      });
    }
  } else if (room.status === "active") {
    const user = await getUserById(userId);
    broadcastToRoom(roomId, {
      type: "opponent_disconnected",
      roomId,
      username: user?.username ?? "unknown player",
    });
  }

  ws.unsubscribe(roomTopic(roomId));
  ws.data.roomId = null;
}