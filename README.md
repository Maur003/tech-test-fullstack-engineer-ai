# Indie catalog

How AI tools were used: see [AI_WORKFLOW.md](AI_WORKFLOW.md).

Internal dashboard for a fictional indie-game catalog, plus a streaming chat that answers questions by calling tools. The catalog is never pasted into the model prompt.

**Stack:** Next.js 14.2.35 (App Router), TypeScript 5.9.3, Tailwind CSS 3.4.19, SQLite via Prisma 6.19.3, Vercel AI SDK 6.0.309 with Gemini, Vitest 3.2.4.

All 12 seed games are fictional.

Try these in the chat:

- "Which game made the most revenue last month?" Lantern Circuit and Paper Harbor tie at $42,000.
- "How many games are rated above 4?" 7. Copper Kite is exactly 4.0, so it is not included.
- "Compare revenue of Lantern Circuit vs Glass Orchard." Glass Orchard is $11,000 below Lantern Circuit, which is -26.190476%.
- "Compare revenue of Lantern vs Nope Game." Neither title is an exact match. The suggestion for "Lantern" is Lantern Circuit. "Nope Game" has no suggestion.
- "What is the average rating per genre?" Puzzle 4, Platformer 4.5, Narrative 4.1, Roguelike 3.85, Simulation 4.

## How to run

Node.js 20 (developed and tested on v20.16.0). This repo pins AI SDK 6 because AI SDK 7 needs Node 22+.

```bash
npm install
cp .env.example .env.local
# set GEMINI_API_KEY (and optionally GEMINI_MODEL) in .env.local
npm run dev
```

`npm install` also runs `prisma generate`. It does not create the database. `data/games.sqlite` is created the first time the catalog is opened: the dashboard calls `GET /api/games`, and that request reaches the repository. If `data/games.sqlite` does not exist yet and `GAMES_DATA_FILE` is unset, the repository creates the file, creates the `games` table, and copies every row from `data/games.json`. An existing database file is not seeded again. Delete `data/games.sqlite` and the next catalog request creates and seeds it again.

If `better-sqlite3` fails to install, use Node 20 LTS (it has a prebuilt binary) or install the C++ build tools for your platform.

Open [http://localhost:3000](http://localhost:3000) for the dashboard and [http://localhost:3000/chat](http://localhost:3000/chat) for chat.

Without `GEMINI_API_KEY`, the dashboard still works. The chat page tells you to set the key, and `POST /api/chat` returns `503`.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## API

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| GET | `/api/games` | `200` array of games | `500` if the catalog database is corrupt |
| POST | `/api/games` | `201` created game | `400` `{ error, fields }`, `409` duplicate title, `413` body over 10 KB, `500` unexpected |
| GET | `/api/games/:id` | `200` game | `404`, `500` unexpected |
| PUT | `/api/games/:id` | `200` updated game | `400` field errors, `404` missing, `409` duplicate title, `413` body over 10 KB, `500` unexpected |
| DELETE | `/api/games/:id` | `204` | `404`, `500` unexpected |
| POST | `/api/chat` | UI message stream | `503` if `GEMINI_API_KEY` is missing, `400` for a bad body, `413` body over 64 KB, `429` with `Retry-After` after 20 requests per minute per IP |

Game fields: `id`, `title`, `developer`, `genre`, `monthly_revenue_usd` (int ≥ 0), `monthly_downloads` (int ≥ 0), `average_rating` (0–5, one decimal).

## Tools

The model can call:

1. `search_games` — optional `genre`, `developer`, `rating_above` (strict `>`), `rating_at_least` (`>=`), `sort_by`, `order`, `limit` (default 10, max 20). Sorting revenue descending keeps every game tied for the top revenue.
2. `count_games` — the same filters.
3. `compare_games` — `{ titles: string[2..4] }`. Exact title match, case-insensitive. Returns rows plus absolute and percent difference versus the first title. Missing titles return `{ notFound, suggestions }` and no invented rows. A suggestion is a catalog title that contains the typed text. Differences are rounded to 6 decimal places. Percent is `null` when the baseline is 0.
4. `aggregate_games` — `{ metric, op: sum|avg|min|max, group_by?: genre|developer }`. `avg` is rounded to 2 decimal places in code. Sum, min, and max are not rounded.

All math runs in code. Tool results are capped at 20 rows. The chat loop stops after 5 steps. The server keeps the last 12 messages and drops a leading non-user message so the window starts with the user.

## Architecture

```
src/app                          routes and route handlers only
src/features/games/domain        types, input schema, title rules, catalog queries
src/features/games/server        Prisma repository over SQLite
src/features/games/components    dashboard, table, dialogs
src/features/chat/server         tool wrappers, prompt, trim, rate limit, model
src/features/chat/components     chat panel
src/lib                          shared helpers (HTTP errors)
src/components                   shared chrome (site header)
```

1. `features/*/domain` imports nothing from `react`, `next`, `fs`, or `ai`.
2. Components never import from a `server` folder.
3. There is no barrel `index.ts` that mixes components and server code.

This is a modular monolith: one Next.js app and one deployable, with feature boundaries enforced by ESLint (`no-restricted-imports`) so a feature, such as the chat or the catalog API, could be extracted later without touching the domain code. The rule is set in three `.eslintrc.json` overrides: domain files cannot import `react`, `next`, `fs`, or `ai`; component files cannot import a `server` folder; `src/features/**/index.ts` cannot import `server` or `components`.

```mermaid
flowchart LR
  page["app/page.tsx"] --> dashboard["games/components"]
  chatPage["app/chat/page.tsx"] --> chatUi["chat/components"]
  dashboard -->|"HTTP /api/games"| gamesApi["app/api/games"]
  chatUi -->|"HTTP POST /api/chat"| chatApi["app/api/chat"]
  gamesApi --> gamesServer["games/server"]
  gamesApi --> gamesDomain["games/domain"]
  chatApi --> chatServer["chat/server"]
  chatServer --> gamesDomain
  chatServer --> gamesServer
  gamesServer --> gamesDomain
```

Feature folders keep each product area's domain, server code, and UI together, instead of splitting one feature across layer folders or atomic design.

## Design decisions

- The catalog file is `data/games.sqlite`. Prisma Client (`prisma/schema.prisma`) reaches it through the `better-sqlite3` adapter in `src/features/games/server/repository.ts`.
- Seeding happens once, on the first repository call that finds no database file and no `GAMES_DATA_FILE`. That call copies `data/games.json` into the new file. A later call leaves the existing rows alone. Delete the file to seed again.
- `GAMES_DATA_FILE`, when set, is the database path. Those databases are created empty and are not seeded from `data/games.json`.
- Routes and pages that read the file or `process.env` set `dynamic = "force-dynamic"` so a POST is visible on the next GET.
- Gemini is called with `@ai-sdk/google` `createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })` because the provider’s default env var is `GOOGLE_GENERATIVE_AI_API_KEY`. Default model is `gemini-2.5-flash`.
- AI SDK 6 APIs from the installed docs: `streamText`, `tool({ inputSchema })`, `stopWhen: stepCountIs(5)`, `convertToModelMessages`, `result.toUIMessageStreamResponse()`, and `useChat` with `DefaultChatTransport`.

## Beyond the brief

- Every route uses `apiError`. Unexpected failures return `500` `{ error: "Something went wrong" }`. The real error is logged on the server and is not sent to the client.
- Games `POST`/`PUT` reject a `Content-Length` over 10 KB with `413`. Chat rejects a `Content-Length` over 64 KB with `413`.
- A missing database is created empty, then seeded from `data/games.json` when that file is present. A database that is not SQLite logs a clear server error and the request returns `500`. It does not retry in a loop.
- Chat checks that `messages` is an array of objects with a role of `system`, `user`, or `assistant` and a `parts` array. Each user text part is capped at 1000 characters. The model call uses `AbortSignal.timeout(30_000)`.
- Chat rate limit: 20 requests per minute per IP, `429` plus `Retry-After`. It is demo-grade and per process. A restart clears it, and another instance does not share the counts.
- Tests use `GAMES_DATA_FILE` so they write a temp SQLite file and never the real database or `data/games.json`. They cover repository CRUD, duplicate titles, 60 parallel creates, the route status codes above, the limiter with an injected clock, and one streamed `search_games` call through `MockLanguageModelV3`.

## Going to production

The catalog is a local SQLite file. A serverless filesystem is still read-only, so production needs that file on a volume or a move to Postgres. Add auth. Move the rate limit to a shared store. Add observability. Keep `GEMINI_API_KEY` on the server. Auth and deployment were left out on purpose.

## Limitations

- SQLite serializes writes to the database file. The chat rate limit is still in-process only, so another instance does not share it.
- The catalog has one monthly figure per game, not a month history.
- Chat needs a Gemini key and is subject to provider quota (the UI shows the `useChat` error, including 429/quota).
- Chat history is not persisted when navigating away.
