import type { UIMessage } from "ai";

const ROLES = new Set(["system", "user", "assistant"]);

export const MAX_USER_TEXT_CHARS = 1000;

export function validateChatMessages(
  body: unknown,
): { ok: true; messages: UIMessage[] } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "messages must be an array" };
  }

  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) {
    return { ok: false, error: "messages must be an array" };
  }

  for (const message of messages) {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      return { ok: false, error: "Each message must be an object" };
    }

    const role = (message as { role?: unknown }).role;
    if (typeof role !== "string" || !ROLES.has(role)) {
      return { ok: false, error: "Each message needs a valid role" };
    }

    const parts = (message as { parts?: unknown }).parts;
    if (!Array.isArray(parts)) {
      return { ok: false, error: "Each message needs parts" };
    }

    if (role !== "user") continue;

    for (const part of parts) {
      if (!part || typeof part !== "object" || Array.isArray(part)) continue;
      if ((part as { type?: unknown }).type !== "text") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text !== "string") {
        return { ok: false, error: "User text must be a string" };
      }
      if (text.length > MAX_USER_TEXT_CHARS) {
        return { ok: false, error: "User messages are limited to 1000 characters" };
      }
    }
  }

  return { ok: true, messages: messages as UIMessage[] };
}
