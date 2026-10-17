import { gamesRepository } from "@/lib/games/repository";
import { parseGameInput } from "@/lib/games/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const games = await gamesRepository.list();
  return Response.json(games);
}

export async function POST(request: Request) {
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

  const game = await gamesRepository.create(parsed.data);
  return Response.json(game, { status: 201 });
}
