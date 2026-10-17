import { apiError, bodyTooLarge, GAMES_MAX_BODY_BYTES, unexpectedError } from "@/lib/http/api-error";
import { parseGameInput } from "@/features/games/domain/schema";
import { DuplicateTitleError } from "@/features/games/domain/titles";
import { gamesRepository } from "@/features/games/server/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const games = await gamesRepository.list();
    return Response.json(games);
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (bodyTooLarge(request, GAMES_MAX_BODY_BYTES)) {
      return apiError(413, "Request body is too large");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "Invalid JSON", {});
    }

    const parsed = parseGameInput(body);
    if (!parsed.ok) {
      return apiError(400, "Invalid game", parsed.fields);
    }

    const game = await gamesRepository.create(parsed.data);
    return Response.json(game, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateTitleError) {
      return apiError(409, "A game with this title already exists", {
        title: ["Title must be unique"],
      });
    }
    return unexpectedError(error);
  }
}
