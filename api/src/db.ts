import { Database } from "bun:sqlite";

export interface User {
  id: string;
  username: string;
  auth_token: string;
}

export interface Room {
  id: string;
  code: string;
  game_type: string;
  state: any;
  current_turn: string | null;
  status: "waiting" | "active" | "finished";
  winner_id: string | null;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  player_index: number;
  symbol: string;
  username?: string;
}

function newId(): string {
  return crypto.randomUUID();
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  auth_token TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  game_type TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '{}',
  current_turn TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  winner_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS room_players (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  player_index INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(room_id, user_id),
  UNIQUE(room_id, player_index),
  UNIQUE(room_id, symbol)
);

CREATE TABLE IF NOT EXISTS moves (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES users(id),
  player_index INTEGER NOT NULL,
  move_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`;

// An ephemeral in-memory database: users, rooms, and moves vanish when the
// process exits, so restarting the server resets every game. State is not
// shared between instances, so the API must run as a single instance.
const db = new Database(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

export async function initDb(): Promise<void> {
  db.exec(SCHEMA);
  console.log("[db] in-memory SQLite schema initialized");
}

function roomFromRow(row: any): Room {
  return { ...row, state: JSON.parse(row.state) };
}

export function getUserByToken(token: string): User | null {
  return db.query("SELECT * FROM users WHERE auth_token = ?").get(token) as User | null;
}

export function getUserById(userId: string): User | null {
  return db.query("SELECT * FROM users WHERE id = ?").get(userId) as User | null;
}

export function createUser(username: string, authToken: string): User | null {
  return db
    .query(
      "INSERT INTO users (id, username, auth_token) VALUES (?, ?, ?) ON CONFLICT (auth_token) DO NOTHING RETURNING *"
    )
    .get(newId(), username, authToken) as User | null;
}

export function getRoomPlayers(roomId: string): RoomPlayer[] {
  return db
    .query(
      `SELECT rp.*, u.username
       FROM room_players rp
       JOIN users u ON u.id = rp.user_id
       WHERE rp.room_id = ?
       ORDER BY rp.player_index`
    )
    .all(roomId) as RoomPlayer[];
}

export function getRoom(roomId: string): Room | null {
  const row = db.query("SELECT * FROM rooms WHERE id = ?").get(roomId);
  return row ? roomFromRow(row) : null;
}

export function getRoomByCode(code: string): Room | null {
  const row = db.query("SELECT * FROM rooms WHERE code = ?").get(code);
  return row ? roomFromRow(row) : null;
}

export function roomCodeExists(code: string): boolean {
  return db.query("SELECT id FROM rooms WHERE code = ?").get(code) !== null;
}

export function createRoom(code: string, gameType: string): Room {
  const row = db
    .query(
      "INSERT INTO rooms (id, code, game_type, state, status) VALUES (?, ?, ?, '{}', 'waiting') RETURNING *"
    )
    .get(newId(), code, gameType);
  return roomFromRow(row);
}

export function addRoomPlayer(
  roomId: string,
  userId: string,
  playerIndex: number,
  symbol: string
): RoomPlayer {
  return db
    .query(
      "INSERT INTO room_players (id, room_id, user_id, player_index, symbol) VALUES (?, ?, ?, ?, ?) RETURNING *"
    )
    .get(newId(), roomId, userId, playerIndex, symbol) as RoomPlayer;
}

export function setRoomActive(roomId: string, state: any, currentTurnUserId: string): Room {
  const row = db
    .query("UPDATE rooms SET state = ?, status = 'active', current_turn = ? WHERE id = ? RETURNING *")
    .get(JSON.stringify(state), currentTurnUserId, roomId);
  return roomFromRow(row);
}

export function updateRoomAfterMove(
  roomId: string,
  state: any,
  currentTurnUserId: string | null
): Room {
  const row = db
    .query("UPDATE rooms SET state = ?, current_turn = ? WHERE id = ? RETURNING *")
    .get(JSON.stringify(state), currentTurnUserId, roomId);
  return roomFromRow(row);
}

export function finishRoom(roomId: string, state: any, winnerId: string | null): Room {
  const row = db
    .query("UPDATE rooms SET state = ?, status = 'finished', winner_id = ? WHERE id = ? RETURNING *")
    .get(JSON.stringify(state), winnerId, roomId);
  return roomFromRow(row);
}

export function recordMove(roomId: string, userId: string, playerIndex: number, moveData: any): void {
  db.query(
    "INSERT INTO moves (id, room_id, player_id, player_index, move_data) VALUES (?, ?, ?, ?, ?)"
  ).run(newId(), roomId, userId, playerIndex, JSON.stringify(moveData));
}

export function getPlayerInRoom(roomId: string, userId: string): RoomPlayer | null {
  return db
    .query("SELECT * FROM room_players WHERE room_id = ? AND user_id = ?")
    .get(roomId, userId) as RoomPlayer | null;
}

export function getPlayerByIndex(roomId: string, playerIndex: number): RoomPlayer | null {
  return db
    .query("SELECT * FROM room_players WHERE room_id = ? AND player_index = ?")
    .get(roomId, playerIndex) as RoomPlayer | null;
}

export function countPlayersInRoom(roomId: string): number {
  const row = db.query("SELECT COUNT(*) AS count FROM room_players WHERE room_id = ?").get(roomId) as {
    count: number;
  };
  return row.count;
}

export function removePlayer(roomId: string, userId: string): void {
  db.query("DELETE FROM room_players WHERE room_id = ? AND user_id = ?").run(roomId, userId);
}

export function deleteRoom(roomId: string): void {
  db.query("DELETE FROM rooms WHERE id = ?").run(roomId);
}