# Bored Games

A collection of classic board games you can play on your phone — either locally on a shared device or online against a friend over the internet.

## Games

Each game has two ways to play:

- **Local** — two players take turns on a single device.
- **Online** — create or join a room over the internet and play against a friend.

| Game | What it is |
| --- | --- |
| **Tic-Tac-Toe** | The classic 3-in-a-row battle. X goes first, O follows. |
| **Checkers** | Capture every piece on the board. Mandatory captures, promotions to kings, and draw rules included. |
| **Battleships** | Hunter-killer on the high seas. Place your five-ship fleet, then take turns firing at the enemy grid until one fleet is sunk. |
| **Chess** | Full rules: castling, en passant, pawn promotion, check, checkmate, stalemate, the fifty-move rule, and insufficient material. |

## How it works

Built as a small three-part project:

| Directory | What it is |
| --- | --- |
| `app/` | The mobile app, built with [Expo](https://expo.dev) (React Native). |
| `api/` | A small [Bun](https://bun.com) WebSocket server that powers online play. |
| `shared/` | Pure TypeScript implementations of the game rules, shared by the app and the API. |

### Game rules

The rules live as **pure TypeScript** in `shared/games/` (e.g. `chess.ts`, `battleships.ts`). They have no server or UI dependencies, so the same code validates a move and computes the next board state in both the app and the API — the server never trusts a move the client sends.

The API registers each game through a common `GameEngine` interface (`api/src/games/`) that handles turn order, move validation, applying moves, and detecting game-over. Battleships is built from a generic **settle-then-play** engine (`api/src/games/setup-game.ts`) that supports an initial private arranging phase (fleet placement, a card draw, dominoes, etc.) before alternating turns begin; future card and tile games can plug into the same factory.

### Local play

All rules run on-device using the shared code. Just hand the phone to a friend after each move.

### Online play

The app talks to the API over a WebSocket (`/ws`). The protocol is defined in `app/src/lib/protocol.ts`:

1. `auth` — the app generates a username (three random words, e.g. `mango-robin-zebra`) and a shared-secret token, and the server records the user.
2. `create_room` / `join_room` — one player creates a room and gets a three-word room code (e.g. `mango-robin-zebra`) to share. Joining requires both the code and the same game type. When the room fills, the server starts the game and broadcasts the initial state.
3. `move` — a player sends a move; the server validates it against the shared engine, applies it, stores it, and broadcasts the new state (`opponent_move`) or `game_over` to everyone in the room.
4. Players disconnect via `leave_room`/socket close; the server cleans up waiting rooms and notifies the remaining player when an opponent drops.

State is persisted in PostgreSQL: users, rooms, players, and every move.

## Setup

### 1. The app

```bash
cd app
npm install
npx expo start
```

Use the Expo output to run the app on a simulator, emulator, Expo Go, or a physical device. Local play needs nothing else.

For **online play** the app must reach the API:

- On an iOS simulator or web, `localhost` works out of the box.
- On an Android emulator, the app defaults to `10.0.2.2` (the host machine).
- On a physical device, either add a `.env` in `app/` with your machine's LAN address, e.g.:
  ```bash
  EXPO_PUBLIC_WS_URL=ws://192.168.1.10:3001/ws
  ```
  or set the WebSocket server address in the app's **Settings** screen after launching.

### 2. The API (for online play)

The server requires [Bun](https://bun.com) and a PostgreSQL database.

```bash
cd api
bun install

# Start a local Postgres (Docker)
bun run db:up

# Start the server
bun run dev        # development (hot reload), or:
bun run start      # production
```

The server listens on `ws://localhost:3001/ws` (override with `PORT`). Connection details for Postgres come from the standard `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE` environment variables and default to the credentials in `api/docker-compose.yml` (`boredgames`/`boredgames` on `localhost:5432`). The schema is created automatically on startup.

### 3. Deploying the API to [Railway](https://railway.com)

A `Dockerfile` at the repo root builds the API for production. It uses the **whole repo as the build context**, so `api/` can resolve the `@shared/*` imports from `shared/`. The image runs `bun run index.ts` from `/app/api`.

```bash
# Push the repo to GitHub
git remote add origin git@github.com:<you>/bored-games.git
git push -u origin main
```

1. **Import the repo.** In the Railway dashboard, **New Project → Deploy from GitHub repo** and select `bored-games`. Railway auto-detects the root `Dockerfile` (build provider **Dockerfile**, root directory left at `/`). Push-to-deploy is enabled automatically.
2. **Add a database.** In the project, **New → Database → Add PostgreSQL**. Railway provisions it and exposes `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, and `DATABASE_URL`.
3. **Link the API to the database.** With the API service selected, go to **Variables → Raw Editor** and add the connection details as variable references (replace `Postgres` with the actual database service name):
   ```text
   PGHOST=${{Postgres.PGHOST}}
   PGPORT=${{Postgres.PGPORT}}
   PGUSER=${{Postgres.PGUSER}}
   PGPASSWORD=${{Postgres.PGPASSWORD}}
   PGDATABASE=${{Postgres.PGDATABASE}}
   ```
   `PORT` is injected by Railway automatically. The schema is created on startup.
4. **Set a shared auth secret.** Add `AUTH_SECRET` to the API service with a random value (e.g. generate one in Railway's variable editor via `CMD+K`). The app must sign tokens with the same secret — set that value as `EXPO_PUBLIC_AUTH_SECRET` in the app build. If you leave both unset, they fall back to the same development default (`bored-games-shared-secret`).
5. **Expose it publicly.** In the API service, go to **Settings → Networking → Generate Domain**. You get a public HTTPS URL such as `https://bored-games-api.up.railway.app`.
6. **Point the app at it.** In `app/.env`:
   ```bash
   EXPO_PUBLIC_WS_URL=wss://bored-games-api.up.railway.app/ws
   EXPO_PUBLIC_AUTH_SECRET=<same value as AUTH_SECRET>
   ```
   (or enter the address in the app's **Settings** screen instead). Rebuild and run the app; online play now goes through Railway.

   The first deployment compiles the Postgres schema on startup, so it may fail with "failed to initialize" until the database is reachable — just retry the deployment once Postgres is healthy.

## 🤖 AI generated code disclaimer

Some of the code in this repository may be generated with the assistance of AI tools. All changes are reviewed and tested on a real device with a human in the loop before being released.

## License

[MIT](LICENSE)