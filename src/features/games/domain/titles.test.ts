import { describe, expect, it } from "vitest";

import type { Game } from "./types";
import { hasDuplicateTitle } from "./titles";

const games: Game[] = [
  {
    id: "1",
    title: "Lantern Circuit",
    developer: "Mira Holt",
    genre: "Puzzle",
    monthly_revenue_usd: 1,
    monthly_downloads: 1,
    average_rating: 4,
  },
  {
    id: "2",
    title: "Paper Harbor",
    developer: "Mira Holt",
    genre: "Puzzle",
    monthly_revenue_usd: 1,
    monthly_downloads: 1,
    average_rating: 4,
  },
];

describe("hasDuplicateTitle", () => {
  it("matches the same title with different case and surrounding spaces", () => {
    expect(hasDuplicateTitle(games, "  lantern circuit ")).toBe(true);
  });

  it("allows an update that keeps the game's own title", () => {
    expect(hasDuplicateTitle(games, "Lantern Circuit", "1")).toBe(false);
  });

  it("rejects an update that takes another game's title", () => {
    expect(hasDuplicateTitle(games, "paper harbor", "1")).toBe(true);
  });
});
