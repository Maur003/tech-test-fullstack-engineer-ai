import { apiError, bodyTooLarge, GAMES_MAX_BODY_BYTES, unexpectedError } from "@/lib/http/api-error";
import { gamesRepository } from "@/lib/games/repository";
import { parseGameInput } from "@/lib/games/schema";
import { DuplicateTitleError } from "@/lib/games/titles";

export const dynamic = "force-dynamic";

type Context = { params: { id: string } };

export async function GET(_request: Request, { params }: Context) {
  try {
    const game = await gamesRepository.get(params.id);
    if (!game) {
      return apiError(404, "Game not found");
    }
    return Response.json(game);
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function PUT(request: Request, { params }: Context) {
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

    const game = await gamesRepository.update(params.id, parsed.data);
    if (!game) {
      return apiError(404, "Game not found");
    }
    return Response.json(game);
  } catch (error) {
    if (error instanceof DuplicateTitleError) {
      return apiError(409, "A game with this title already exists", {
        title: ["Title must be unique"],
      });
    }
    return unexpectedError(error);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const deleted = await gamesRepository.delete(params.id);
    if (!deleted) {
      return apiError(404, "Game not found");
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return unexpectedError(error);
  }
}
