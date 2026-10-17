import { beforeEach, expect, it } from "vitest";

import { CHAT_MAX_BODY_BYTES } from "@/lib/http/api-error";
import { resetChatRateLimit } from "@/lib/chat/rate-limit";

import { POST } from "./route";

const previousKey = process.env.GEMINI_API_KEY;

function chatRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.20",
      ...headers,
    },
    body,
  });
}

beforeEach(() => {
  resetChatRateLimit();
  process.env.GEMINI_API_KEY = "test-key";
});

it("returns 503 when the API key is missing", async () => {
  delete process.env.GEMINI_API_KEY;
  const response = await POST(chatRequest("{}"));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    error: "Set GEMINI_API_KEY in .env.local to use chat.",
  });
  if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousKey;
});

it("returns 400 for a bad chat body", async () => {
  const invalidJson = await POST(chatRequest("{"));
  expect(invalidJson.status).toBe(400);
  expect(await invalidJson.json()).toEqual({ error: "Invalid JSON" });

  const missingMessages = await POST(chatRequest(JSON.stringify({})));
  expect(missingMessages.status).toBe(400);
  expect(await missingMessages.json()).toEqual({ error: "messages must be an array" });

  const badRole = await POST(
    chatRequest(JSON.stringify({ messages: [{ role: "tool", parts: [] }] })),
  );
  expect(badRole.status).toBe(400);
  expect(await badRole.json()).toEqual({ error: "Each message needs a valid role" });

  const missingParts = await POST(
    chatRequest(JSON.stringify({ messages: [{ role: "user" }] })),
  );
  expect(missingParts.status).toBe(400);
  expect(await missingParts.json()).toEqual({ error: "Each message needs parts" });

  const tooLong = await POST(
    chatRequest(
      JSON.stringify({
        messages: [{ role: "user", parts: [{ type: "text", text: "a".repeat(1001) }] }],
      }),
    ),
  );
  expect(tooLong.status).toBe(400);
  expect(await tooLong.json()).toEqual({
    error: "User messages are limited to 1000 characters",
  });
});

it("returns 413 when Content-Length is over 64 KB", async () => {
  const response = await POST(
    chatRequest("{}", { "content-length": String(CHAT_MAX_BODY_BYTES + 1) }),
  );
  expect(response.status).toBe(413);
  expect(await response.json()).toEqual({ error: "Request body is too large" });
});

it("returns 429 with Retry-After after 20 requests from one IP", async () => {
  for (let index = 0; index < 20; index += 1) {
    const response = await POST(
      chatRequest("{", { "x-forwarded-for": "203.0.113.77" }),
    );
    expect(response.status).toBe(400);
  }

  const limited = await POST(chatRequest("{", { "x-forwarded-for": "203.0.113.77" }));
  expect(limited.status).toBe(429);
  expect(limited.headers.get("retry-after")).toBeTruthy();
  expect(await limited.json()).toEqual({ error: "Too many requests" });
});
