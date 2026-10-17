import { gamesRepository } from "@/lib/games/repository";
import { parseGameInput } from "@/lib/games/schema";
import { DuplicateTitleError } from "@/lib/games/titles";

export const dynamic = "force-dynamic";

type Context = { params: { id: string } };

export async function GET(_request: Request, { params }: Context) {
  const game = await gamesRepository.get(params.id);
  if (!game) {
    return Response.json({ error: "Game not found" }, { status: 404 });
  }
  return Response.json(game);
}

export async function PUT(request: Request, { params }: Context) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON", fields: {} },
      { status: 400 },
    );
  }

  const parsed = parseGameInput(body);
  if (!parsed.ok) {
    return Response.json(
      { error: "Invalid game", fields: parsed.fields },
      { status: 400 },
    );
  }

  try {
    const game = await gamesRepository.update(params.id, parsed.data);
    if (!game) {
      return Response.json({ error: "Game not found" }, { status: 404 });
    }
    return Response.json(game);
  } catch (error) {
    if (error instanceof DuplicateTitleError) {
      return Response.json(
        {
          error: "A game with this title already exists",
          fields: { title: ["Title must be unique"] },
        },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const deleted = await gamesRepository.delete(params.id);
  if (!deleted) {
    return Response.json({ error: "Game not found" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
