# Indie catalog

How AI tools were used: see [AI_WORKFLOW.md](AI_WORKFLOW.md).

Internal dashboard for a fictional indie-game catalog, plus a streaming chat that answers questions by calling tools. The catalog is never pasted into the model prompt.

## How to run

Requires Node.js 20 (this repo pins AI SDK 6 because AI SDK 7 needs Node 22+).

```bash
npm install
cp .env.example .env.local
# set GEMINI_API_KEY (and optionally GEMINI_MODEL) in .env.local
npm run dev
```

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
| GET | `/api/games` | `200` array of games | |
| POST | `/api/games` | `201` created game | `400` `{ error, fields }`, `409` duplicate title |
| GET | `/api/games/:id` | `200` game | `404` |
| PUT | `/api/games/:id` | `200` updated game | `400` field errors, `404` missing, `409` duplicate title |
| DELETE | `/api/games/:id` | `204` | `404` |
| POST | `/api/chat` | UI message stream | `503` if `GEMINI_API_KEY` is missing, `400` for a bad body |

Game fields: `id`, `title`, `developer`, `genre`, `monthly_revenue_usd` (int ≥ 0), `monthly_downloads` (int ≥ 0), `average_rating` (0–5, one decimal).

## Tools

The model can call:

1. `search_games` — optional `genre`, `developer`, `rating_above` (strict `>`), `rating_at_least` (`>=`), `sort_by`, `order`, `limit` (default 10, max 20). Sorting revenue descending keeps every game tied for the top revenue.
2. `count_games` — the same filters.
3. `compare_games` — `{ titles: string[2..4] }`. Exact title match, case-insensitive. Returns rows plus absolute and percent difference versus the first title. Missing titles return `{ notFound, suggestions }` and no invented rows. A suggestion is a catalog title that contains the typed text. Differences are rounded to 6 decimal places. Percent is `null` when the baseline is 0.
4. `aggregate_games` — `{ metric, op: sum|avg|min|max, group_by?: genre|developer }`. `avg` is rounded to 2 decimal places in code. Sum, min, and max are not rounded.

All math runs in code. Tool results are capped at 20 rows. The chat loop stops after 5 steps. The server keeps the last 12 messages and drops a leading non-user message so the window starts with the user.

## Design decisions

- Persistence is `data/games.json` behind `src/lib/games/repository.ts`. Writes are queued in-process and saved by writing a temp file then renaming it.
- Routes and pages that read the file or `process.env` set `dynamic = "force-dynamic"` so a POST is visible on the next GET.
- Gemini is called with `@ai-sdk/google` `createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })` because the provider’s default env var is `GOOGLE_GENERATIVE_AI_API_KEY`. Default model is `gemini-2.5-flash`.
- AI SDK 6 APIs from the installed docs: `streamText`, `tool({ inputSchema })`, `stopWhen: stepCountIs(5)`, `convertToModelMessages`, `result.toUIMessageStreamResponse()`, and `useChat` with `DefaultChatTransport`.

## Limitations

- No auth, no deployment config, and no tests beyond the tool math, Zod validation, and history trim.
- The JSON write lock is in-process only. Two Node processes can still race.
- The catalog has one monthly figure per game, not a month history.
- Chat needs a Gemini key and is subject to provider quota (the UI shows the `useChat` error, including 429/quota).
- Chat history is not persisted when navigating away.
