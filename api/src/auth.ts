import { randomWord } from "@shared/words";

export { generateUsername } from "@shared/words";

const SHARED_SECRET = process.env.AUTH_SECRET || "bored-games-shared-secret";

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