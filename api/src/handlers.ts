import type { ServerWebSocket } from "bun";
import {
  addRoomPlayer,
  countPlayersInRoom,
  createRoom,
  createUser,
  deleteRoom,
  finishRoom,
  getPlayerByIndex,
  getPlayerInRoom,
  getRoom,
  getRoomByCode,
  getRoomPlayers,
  getUserById,
  getUserByToken,
  recordMove,
  removePlayer,
  roomCodeExists,
  setRoomActive,
  updateRoomAfterMove,
} from "./db";
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

export function onSocketOpen(ws: ServerWebSocket<WsData>): void {
  ws.data = { userId: null, username: null, roomId: null };
}

export function onSocketMessage(
  ws: ServerWebSocket<WsData>,
  rawMessage: string | Buffer
): void {
  let msg: Message;
  try {
    msg = JSON.parse(String(rawMessage));
  } catch {
    sendError(ws, "Invalid JSON message");
    return;
  }

  switch (msg.type) {
    case "auth":
      handleAuth(ws, msg);
      break;
    case "create_room":
      handleCreateRoom(ws, msg);
      break;
    case "join_room":
      handleJoinRoom(ws, msg);
      break;
    case "move":
      handleMove(ws, msg);
      break;
    case "leave_room":
      handleLeaveRoom(ws);
      break;
    case "ping":
      send(ws, { type: "pong" });
      break;
    default:
      sendError(ws, `Unknown message type: ${msg.type}`);
  }
}

export function onSocketClose(ws: ServerWebSocket<WsData>): void {
  handleDisconnect(ws);
}

function handleAuth(ws: ServerWebSocket<WsData>, msg: Message): void {
  const { token, username } = msg;
  if (typeof token !== "string" || typeof username !== "string") {
    sendError(ws, "auth requires token and username");
    return;
  }

  if (!verifyToken(username, token)) {
    send(ws, { type: "auth_fail", reason: "Invalid credentials" });
    return;
  }

  let user = getUserByToken(token);
  if (!user) {
    user = createUser(username, token);
  }
  if (!user) {
    sendError(ws, "Could not create user");
    return;
  }

  ws.data.userId = user.id;
  ws.data.username = user.username;
  send(ws, { type: "auth_ok", username: user.username, userId: user.id });
}

function handleCreateRoom(ws: ServerWebSocket<WsData>, msg: Message): void {
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
    if (!roomCodeExists(code)) break;
    code = generateRoomCode();
  }

  const userId = ws.data.userId;
  const room = createRoom(code, gameType);

  const player = addRoomPlayer(room.id, userId, 0, engine.getPlayerSymbol(0));

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

function handleJoinRoom(ws: ServerWebSocket<WsData>, msg: Message): void {
  if (!ws.data.userId) {
    sendError(ws, "Not authenticated");
    return;
  }

  const { code, gameType } = msg;
  if (typeof code !== "string") {
    sendError(ws, "code is required");
    return;
  }
  if (typeof gameType !== "string") {
    sendError(ws, "gameType is required");
    return;
  }

  const normalized = code.trim().toLowerCase();
  const room = getRoomByCode(normalized);
  if (!room) {
    sendError(ws, "Room not found");
    return;
  }

  if (room.status !== "waiting") {
    sendError(ws, "Room is not accepting players");
    return;
  }

  if (room.game_type !== gameType) {
    sendError(
      ws,
      `Wrong game type: this room is for ${room.game_type}, not ${gameType}`
    );
    return;
  }

  const engine = getGameEngine(room.game_type);
  if (!engine) {
    sendError(ws, "Room has an unknown game type");
    return;
  }

  const userId = ws.data.userId;
  const members = getRoomPlayers(room.id);
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
  const player = addRoomPlayer(room.id, userId, playerIndex, engine.getPlayerSymbol(playerIndex));

  ws.data.roomId = room.id;
  ws.subscribe(roomTopic(room.id));

  send(ws, {
    type: "room_joined",
    roomId: room.id,
    code: room.code,
    playerIndex: player.player_index,
    symbol: player.symbol,
  });

  const updatedMembers = getRoomPlayers(room.id);
  const managedByEngine = updatedMembers.length >= engine.playerCount.min;

  if (managedByEngine) {
    // Start the game
    const initialState = engine.createInitialState(updatedMembers.length);
    const updated = setRoomActive(room.id, initialState, updatedMembers[0].user_id);

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

function handleMove(ws: ServerWebSocket<WsData>, msg: Message): void {
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

  const room = getRoom(roomId);
  if (!room) {
    sendError(ws, "Room not found");
    return;
  }

  if (room.status !== "active") {
    sendError(ws, "Game is not active");
    return;
  }

  // Turn enforcement lives in the game engine: settle-phase games let every
  // player act while arranging, so a DB-level "current_turn" gate cannot apply.
  const engine = getGameEngine(room.game_type);
  if (!engine) {
    sendError(ws, "Unknown game type");
    return;
  }

  const player = getPlayerInRoom(roomId, userId);
  if (!player) {
    sendError(ws, "You are not in this room");
    return;
  }

  const playerIndex = player.player_index;

  if (!engine.validateMove(room.state, moveData, playerIndex)) {
    sendError(ws, "Invalid move");
    return;
  }

  const members = getRoomPlayers(roomId);
  const newState = engine.applyMove(room.state, moveData, playerIndex, members.length);
  const gameOver = engine.checkGameOver(newState);

  recordMove(roomId, userId, playerIndex, moveData);

  if (gameOver) {
    const winnerId =
      gameOver.winnerIndex !== null
        ? (getPlayerByIndex(roomId, gameOver.winnerIndex)?.user_id ?? null)
        : null;

    const updated = finishRoom(roomId, newState, winnerId);

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

  const updated = updateRoomAfterMove(roomId, newState, nextPlayerId);

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

function handleLeaveRoom(ws: ServerWebSocket<WsData>): void {
  handleDisconnect(ws);
}

function handleDisconnect(ws: ServerWebSocket<WsData>): void {
  const { userId, roomId } = ws.data;
  if (!userId || !roomId) return;

  const room = getRoom(roomId);
  if (!room) {
    ws.data.roomId = null;
    return;
  }

  if (room.status === "waiting") {
    // Remove player from waiting room
    removePlayer(roomId, userId);
    if (countPlayersInRoom(roomId) === 0) {
      deleteRoom(roomId);
    } else {
      broadcastToRoom(roomId, {
        type: "player_left",
        roomId,
        username: ws.data.username,
      });
    }
  } else if (room.status === "active") {
    const user = getUserById(userId);
    broadcastToRoom(roomId, {
      type: "opponent_disconnected",
      roomId,
      username: user?.username ?? "unknown player",
    });
  }

  ws.unsubscribe(roomTopic(roomId));
  ws.data.roomId = null;
}