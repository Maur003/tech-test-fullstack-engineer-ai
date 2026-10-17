# AI workflow

I used Cursor as the main tool and a separate Claude chat for planning and review. Cursor wrote most of the code. I wrote the prompts (several drafted with Claude's help), made the scope and design calls, and ran the checks. The details are below.

## Tools and why

**Cursor (agent chat), inside the repo.** It reads the tree, runs lint, typecheck, tests and build, and can open the app in the browser. That mattered more than a plain chat window here, because the catalog and the chat route had to be checked against real output, not against what a model said they should do.

**Claude, in a separate chat (not Claude Code).** I used it outside the repo to turn the brief into prompts for Cursor, to review Cursor's plan, and to review the pushed branch. Its sandbox could not install npm packages, so it never ran the app. It read the code and ran small probes on the pure logic (the tool functions and the repository). Everything about the running app (build, streaming, the browser) was checked by me through Cursor.

Several follow-up items came out of that review: `force-dynamic` on routes and pages (Next 14 caches GET handlers at build time), title suggestions in `compare_games`, duplicate-title rejection, rounding of averages, and the feature-folder layout.

## Prompts that mattered

**1. The brief, plan first, then build.**
Prompt (excerpt): *"FIRST: read the docs of the Next.js and Vercel AI SDK versions you install ... Do not rely on memory for APIs."* and *"Plan first (files + order), wait for my OK, then implement in small commits."*
Outcome: Next.js 14.2.35, TypeScript, Tailwind, a games API, and a streaming chat that only sees the catalog through four tools (`search_games`, `count_games`, `compare_games`, `aggregate_games`). I approved the plan with changes: `force-dynamic`, title suggestions on a missing title, a 503 without a key, an error message in the chat UI, and a history trim that starts at a user message.
What I decided: keep the plan's Node check, and pin AI SDK 6 when Node turned out to be 20 (see below).

**2. Follow-up and hardening.**
Prompt (excerpt): *"Keep Next 14 and AI SDK 6, add no new dependencies, one commit per item ... Do NOT create AI_WORKFLOW.md; I will write it myself."*
Outcome: duplicate titles return 409, averages round to 2 decimals, saving and deleting survive a network failure, the dashboard separates load errors from action errors, and the chat shows a failed lookup without disabling the input. A second "phase 2" pass covered error handling and tests. One result was a test of the streaming route with a mock model from `ai/test`.

**3. Replace the browser `window.confirm`.**
Prompt (summary, not verbatim): replace the native confirm dialog with an in-app one.
Outcome: an in-app delete dialog, a dark theme, and the catalog table, checked in the browser with the game rows. I asked for this because the native dialog showed up as a "localhost" popup.

**4. Structural refactor, move only.**
Prompt (excerpt): *"Prompt 0: structural refactor, MOVE ONLY ... The number of tests must be IDENTICAL before and after."*
Outcome: `src/app` holds routes, `src/features/games` and `src/features/chat` hold the feature code, and shared helpers stay in `src/lib`. ESLint `no-restricted-imports` enforces three boundaries. Before and after: 9 files, 30 tests. One thing the move broke: Tailwind's content globs did not include `src/features`, so the moved components would have lost their classes. Cursor added the glob.

**5. SQLite, then Prisma.**
Prompt (excerpt): *"Lets add prisma, you can download it."*
Outcome: `data/games.sqlite`, seeded once from `data/games.json`, queried through Prisma Client with the `better-sqlite3` adapter. `GET /api/games` still returns the 12 games and the dashboard shows them.
What I decided: this was my call. The brief allows JSON, SQLite or in-memory, so it was optional. It cost some version work: `better-sqlite3` 12 needs Node 22, so I installed 11; Prisma 7 expects a newer client setup, so I installed 6.19.3; `better-sqlite3` 11 ships no types, so I added `@types/better-sqlite3`.

## Where the AI got it wrong

The first plan was written for AI SDK 7 (`createUIMessageStreamResponse`, `toUIMessageStream`). My machine runs Node v20.16.0 and AI SDK 7 needs Node 22 or newer. I had told Cursor to check `node -v` before choosing an SDK, and that check caught it before any chat code was written. The fix was to install AI SDK 6 and read the docs that shipped in `node_modules/ai` instead of the public docs: `streamText`, `tool({ inputSchema })`, `stopWhen: stepCountIs(5)`, `result.toUIMessageStreamResponse()`, and `useChat` with `DefaultChatTransport`. The package versions also do not line up by number: `@ai-sdk/react@6` does not exist. The matching versions are `ai@6.0.309`, `@ai-sdk/react@3.0.312` and `@ai-sdk/google@3.0.135`.

Smaller misses along the way:

- A test expected the query "Lantern Ghost" to suggest "Lantern Circuit". The spec says a suggestion is a catalog title that contains the typed text, and "Lantern Circuit" does not contain "Lantern Ghost". The test was wrong, not the code, so I changed the query to "Lantern".
- Subtracting ratings produced `-0.39999999999999947`. The differences are now rounded to 6 decimal places.
- A test hook exported `setChatModelForTests` from the chat route file. Next.js rejected it (`TS2344`, an extra export is not an HTTP handler). The setter moved to its own module, and the mock stream chunks were typed as `LanguageModelV3StreamPart` after a `TS2322` error.

## Parallel agents and worktrees

None. No subagents and no git worktrees. Each pass ran in the same working tree, followed by lint, typecheck, tests and build.

## What I verified myself and what I trusted

Verified, with real output:

- `npm run lint`, `npm run typecheck`, `npm test` (30 tests) and `npm run build` after the Prisma change.
- `next build && next start`: a POST created a game and the next GET included it (12 to 13), DELETE returned 204, a duplicate title returned 409, and `POST /api/chat` without a key returned 503. The first attempt used `curl.exe` from PowerShell, which stripped the JSON quotes and returned a misleading `400 Invalid JSON`. I repeated it with a Node `fetch` script.
- The five catalog questions asked through the chat with the default model (`gemini-2.5-flash`): all returned HTTP 200 with the expected tool results.
- The dashboard in the browser, including the game rows after the Prisma change.

Trusted without checking myself: the exact version numbers Cursor picked for the Prisma packages, and the library docs that shipped in `node_modules`. One of them was off: the installed adapter type is `PrismaBetterSQLite3`, while the public docs spell it `PrismaBetterSqlite3`.
