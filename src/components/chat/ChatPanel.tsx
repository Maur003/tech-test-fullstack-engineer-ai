"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai";
import { useEffect, useRef, useState } from "react";

const suggestions = [
  "Which game made the most revenue last month?",
  "How many games are rated above 4?",
  "What is the average rating per genre?",
];

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);

  function submit(text: string) {
    const next = text.trim();
    if (!next || busy) return;
    void sendMessage({ text: next });
    setInput("");
  }

  return (
    <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-panel/80 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div role="log" aria-live="polite" className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div className="my-auto flex flex-col items-start gap-3">
            <p className="max-w-md text-sm leading-6 text-stone-400">
              Ask about revenue, ratings, or a comparison. Each lookup shows up as a chip while the assistant checks the catalog.
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-left text-sm text-stone-200 transition hover:border-amber-300/40 hover:bg-amber-400/10"
                  onClick={() => submit(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((message) => {
          const mine = message.role === "user";
          return (
            <article
              key={message.id}
              className={`animate-pop max-w-[40rem] rounded-2xl px-4 py-3 ${
                mine
                  ? "ml-auto bg-amber-400 text-ink"
                  : "border border-white/10 bg-white/[0.04] text-stone-100"
              }`}
            >
              <p className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${mine ? "text-ink/60" : "text-stone-500"}`}>
                {mine ? "You" : "Assistant"}
              </p>
              <div className="flex flex-col gap-2 whitespace-pre-wrap text-sm leading-6">
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return <p key={index}>{part.text}</p>;
                  }
                  if (!isToolUIPart(part)) return null;
                  if (part.state === "output-error") {
                    return (
                      <p
                        key={part.toolCallId}
                        className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-100"
                      >
                        Lookup failed{" "}
                        <span className="font-semibold">{getToolName(part)}</span>{" "}
                        {part.errorText}
                      </p>
                    );
                  }
                  const pending =
                    part.state === "input-streaming" || part.state === "input-available";
                  return (
                    <p
                      key={part.toolCallId}
                      className={`rounded-xl px-3 py-2 text-xs ${
                        mine
                          ? "bg-ink/10 text-ink"
                          : "border border-amber-300/20 bg-amber-400/10 text-amber-100"
                      }`}
                    >
                      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle" />
                      {pending ? "Looking up games..." : "Looked up games"}{" "}
                      <span className="font-semibold">{getToolName(part)}</span>
                      <span className="mt-1 block font-mono text-[11px] opacity-80">
                        {JSON.stringify(part.input ?? {})}
                      </span>
                    </p>
                  );
                })}
              </div>
            </article>
          );
        })}
        {busy && messages.at(-1)?.role === "user" ? (
          <p className="animate-pulse text-sm text-stone-400">Looking up games...</p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 bg-ink/40 p-3 sm:p-4">
        {error ? (
          <p role="alert" className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {readableError(error)}
          </p>
        ) : null}
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <input
            id="chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Which game made the most revenue last month?"
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/30"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            className="rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-amber-300 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
