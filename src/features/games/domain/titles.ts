import type { Game } from "./types";

export class DuplicateTitleError extends Error {
  constructor() {
    super("A game with this title already exists");
    this.name = "DuplicateTitleError";
  }
}

export function hasDuplicateTitle(
  games: Game[],
  title: string,
  ignoreId?: string,
): boolean {
  const needle = title.trim().toLowerCase();
  return games.some(
    (game) => game.id !== ignoreId && game.title.trim().toLowerCase() === needle,
  );
}
