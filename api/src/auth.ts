import { WORDS } from "./words";

const SHARED_SECRET = process.env.AUTH_SECRET || "bored-games-shared-secret";

export function randomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

export function generateUsername(): string {
  return [randomWord(), randomWord(), randomWord()].join("-");
}

export function generateRoomCode(): string {
  return [randomWord(), randomWord(), randomWord()].join("-");
}

export function generateToken(username: string): string {
  return new Bun.CryptoHasher("sha256")
    .update(`${username}:${SHARED_SECRET}`)
    .digest("hex");
}

export function verifyToken(username: string, token: string): boolean {
  return generateToken(username) === token;
}