import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import { SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import { trimToRecentUserTurns } from "@/lib/chat/trim";
import { createGameTools } from "@/lib/games/ai-tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "Set GEMINI_API_KEY in .env.local to use chat." },
      { status: 503 },
    );
  }

  let body: { messages?: UIMessage[] };
  try {
    body = (await request.json()) as { messages?: UIMessage[] };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.messages)) {
    return Response.json(
      { error: "messages must be an array" },
      { status: 400 },
    );
  }

  const messages = trimToRecentUserTurns(body.messages, 12);
  if (messages.length === 0) {
    return Response.json(
      { error: "Send a user message." },
      { status: 400 },
    );
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const result = streamText({
    model: google(process.env.GEMINI_MODEL || "gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: createGameTools(),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse({
    onError(error) {
      if (error instanceof Error) return error.message;
      return "The model request failed.";
    },
  });
}
