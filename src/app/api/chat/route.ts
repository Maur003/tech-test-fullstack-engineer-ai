import { convertToModelMessages, stepCountIs, streamText } from "ai";

import { validateChatMessages } from "@/lib/chat/messages";
import { resolveChatModel } from "@/lib/chat/model";
import { clientIp, consumeChatRateLimit } from "@/lib/chat/rate-limit";
import { SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import { trimToRecentUserTurns } from "@/lib/chat/trim";
import { createGameTools } from "@/lib/games/ai-tools";
import { apiError, bodyTooLarge, CHAT_MAX_BODY_BYTES, unexpectedError } from "@/lib/http/api-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (bodyTooLarge(request, CHAT_MAX_BODY_BYTES)) {
      return apiError(413, "Request body is too large");
    }

    const limit = consumeChatRateLimit(clientIp(request), Date.now());
    if (!limit.allowed) {
      const response = apiError(429, "Too many requests");
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }

    if (!process.env.GEMINI_API_KEY) {
      return apiError(503, "Set GEMINI_API_KEY in .env.local to use chat.");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "Invalid JSON");
    }

    const validated = validateChatMessages(body);
    if (!validated.ok) {
      return apiError(400, validated.error);
    }

    const messages = trimToRecentUserTurns(validated.messages, 12);
    if (messages.length === 0) {
      return apiError(400, "Send a user message.");
    }

    const result = streamText({
      model: resolveChatModel(),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: createGameTools(),
      stopWhen: stepCountIs(5),
      abortSignal: AbortSignal.timeout(30_000),
    });

    return result.toUIMessageStreamResponse({
      onError(error) {
        if (error instanceof Error) return error.message;
        return "The model request failed.";
      },
    });
  } catch (error) {
    return unexpectedError(error);
  }
}
