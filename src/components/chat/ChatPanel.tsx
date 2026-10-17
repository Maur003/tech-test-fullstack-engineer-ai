"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai";
import { useState } from "react";

function readableError(error: Error): string {
  const raw = error.message?.trim() || "The chat request failed.";
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (typeof parsed.error === "string" && parsed.error.length > 0) {
      return parsed.error;
    }
  } catch {
    // Response body was not JSON.
  }
  if (/429|quota|RESOURCE_EXHAUSTED|rate limit/i.test(raw)) {
    return `The model provider rejected the request because of rate limit or quota. ${raw}`;
  }
  return raw;
}

export function ChatPanel() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-80 flex-col gap-3">
        {messages.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 bg-white px-4 py-8 text-stone-600">
            Ask about revenue, ratings, or a comparison. The assistant looks games up with tools.
          </p>
        ) : null}
        {messages.map((message) => (
          <article
            key={message.id}
            className={
              message.role === "user"
                ? "ml-auto max-w-[40rem] rounded-lg bg-amber-900 px-3 py-2 text-white"
                : "max-w-[40rem] rounded-lg border border-stone-200 bg-white px-3 py-2"
            }
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
              {message.role === "user" ? "You" : "Assistant"}
            </p>
            <div className="flex flex-col gap-2 whitespace-pre-wrap">
              {message.parts.map((part, index) => {
                if (part.type === "text") {
                  return <p key={index}>{part.text}</p>;
                }
                if (!isToolUIPart(part)) return null;
                const pending =
                  part.state === "input-streaming" || part.state === "input-available";
                return (
                  <p
                    key={part.toolCallId}
                    className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-950"
                  >
                    {pending ? "Looking up games..." : "Looked up games"}{" "}
                    <span className="font-semibold">{getToolName(part)}</span>{" "}
                    <span className="font-mono">{JSON.stringify(part.input ?? {})}</span>
                  </p>
                );
              })}
            </div>
          </article>
        ))}
        {busy && messages.at(-1)?.role === "user" ? (
          <p className="text-sm text-stone-600">Looking up games...</p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {readableError(error)}
        </p>
      ) : null}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const text = input.trim();
          if (!text || busy) return;
          void sendMessage({ text });
          setInput("");
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={busy}
          placeholder="Which game made the most revenue last month?"
          className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          className="rounded-md bg-amber-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
