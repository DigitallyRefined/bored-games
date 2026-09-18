import { SQL } from "bun";

export const sql = new SQL({
  hostname: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  username: process.env.PGUSER || "boredgames",
  password: process.env.PGPASSWORD || "boredgames",
  database: process.env.PGDATABASE || "boredgames",
  max: 10,
  idleTimeout: 30,
});

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  auth_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  game_type TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_turn UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  winner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  player_index INT NOT NULL,
  symbol TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id),
  UNIQUE(room_id, player_index),
  UNIQUE(room_id, symbol)
);

CREATE TABLE IF NOT EXISTS moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id),
  player_index INT NOT NULL,
  move_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

export async function initDb(): Promise<void> {
  await sql.unsafe(SCHEMA);
  console.log("[db] schema initialized");
}

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