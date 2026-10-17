import { beforeEach, expect, it } from "vitest";

import { consumeChatRateLimit, resetChatRateLimit } from "./rate-limit";

beforeEach(() => {
  resetChatRateLimit();
});

it("allows 20 calls per IP per minute and then reports Retry-After", () => {
  const start = 1_700_000_000_000;
  for (let index = 0; index < 20; index += 1) {
    expect(consumeChatRateLimit("9.9.9.9", start).allowed).toBe(true);
  }

  expect(consumeChatRateLimit("9.9.9.9", start + 1_000)).toEqual({
    allowed: false,
    retryAfterSeconds: 59,
  });
  expect(consumeChatRateLimit("8.8.8.8", start).allowed).toBe(true);
  expect(consumeChatRateLimit("9.9.9.9", start + 60_000).allowed).toBe(true);
});
