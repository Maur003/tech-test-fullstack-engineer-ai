import { describe, expect, it } from "vitest";

import { trimToRecentUserTurns } from "./trim";

describe("trimToRecentUserTurns", () => {
  it("keeps the last 12 messages when the window starts with a user", () => {
    const messages = Array.from({ length: 14 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      id: String(index),
    }));
    const trimmed = trimToRecentUserTurns(messages, 12);
    expect(trimmed).toHaveLength(12);
    expect(trimmed[0].role).toBe("user");
    expect(trimmed[0].id).toBe("2");
  });

  it("drops a leading assistant message so the first kept message is from the user", () => {
    const messages = [
      { role: "user", id: "u0" },
      { role: "assistant", id: "a0" },
      { role: "user", id: "u1" },
      { role: "assistant", id: "a1" },
    ];
    const trimmed = trimToRecentUserTurns(messages, 3);
    expect(trimmed.map((message) => message.id)).toEqual(["u1", "a1"]);
  });
});
