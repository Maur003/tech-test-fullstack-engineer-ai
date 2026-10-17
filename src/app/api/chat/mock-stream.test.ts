import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import type { LanguageModelV3StreamPart } from "@ai-sdk/provider";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { afterEach, beforeEach, expect, it } from "vitest";

import { setChatModelForTests } from "@/features/chat/server/model";
import { resetChatRateLimit } from "@/features/chat/server/rate-limit";
import { gamesRepository } from "@/features/games/server/repository";

import { POST } from "./route";

const realFile = path.join(process.cwd(), "data", "games.json");
const previousDataFile = process.env.GAMES_DATA_FILE;
const previousKey = process.env.GEMINI_API_KEY;

const usage = {
  inputTokens: { total: 8, noCache: 8, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 4, text: 4, reasoning: 0 },
};

function stream(chunks: LanguageModelV3StreamPart[]) {
  return {
    stream: simulateReadableStream({
      chunks,
      initialDelayInMs: null,
      chunkDelayInMs: null,
    }),
  };
}

let dir = "";
let realBefore = "";

beforeEach(async () => {
  resetChatRateLimit();
  process.env.GEMINI_API_KEY = "test-key";
  realBefore = await readFile(realFile, "utf8");
  dir = await mkdtemp(path.join(tmpdir(), "chat-mock-"));
  process.env.GAMES_DATA_FILE = path.join(dir, "games.sqlite");
  await gamesRepository.create({
    title: "Temp Game",
    developer: "Test Studio",
    genre: "Puzzle",
    monthly_revenue_usd: 5,
    monthly_downloads: 6,
    average_rating: 4,
  });

  setChatModelForTests(
    new MockLanguageModelV3({
      doStream: [
        stream([
          { type: "stream-start", warnings: [] },
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "search_games",
            input: JSON.stringify({ limit: 1 }),
          },
          {
            type: "finish",
            finishReason: { unified: "tool-calls", raw: "tool-calls" },
            usage,
          },
        ]),
        stream([
          { type: "stream-start", warnings: [] },
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: "Temp Game is in the catalog." },
          { type: "text-end", id: "text-1" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: "stop" },
            usage,
          },
        ]),
      ],
    }),
  );
});

afterEach(async () => {
  setChatModelForTests(undefined);
  if (previousDataFile === undefined) delete process.env.GAMES_DATA_FILE;
  else process.env.GAMES_DATA_FILE = previousDataFile;
  if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousKey;
  await rm(dir, { recursive: true, force: true });
  expect(await readFile(realFile, "utf8")).toBe(realBefore);
});

it("streams a search_games tool call through /api/chat", async () => {
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.90",
      },
      body: JSON.stringify({
        messages: [
          {
            id: "user-1",
            role: "user",
            parts: [{ type: "text", text: "Find one game." }],
          },
        ],
      }),
    }),
  );

  expect(response.status).toBe(200);
  const text = await response.text();
  expect(text).toContain("search_games");
  expect(text).toContain("Temp Game");
});
