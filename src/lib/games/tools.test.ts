import { describe, expect, it } from "vitest";

import type { Game } from "./types";
import { aggregateGames, compareGames, countGames, searchGames } from "./tools";

const games: Game[] = [
  {
    id: "1",
    title: "Lantern Circuit",
    developer: "Mira Holt",
    genre: "Puzzle",
    monthly_revenue_usd: 42000,
    monthly_downloads: 100,
    average_rating: 4.6,
  },
  {
    id: "2",
    title: "Paper Harbor",
    developer: "Mira Holt",
    genre: "Puzzle",
    monthly_revenue_usd: 42000,
    monthly_downloads: 50,
    average_rating: 4.2,
  },
  {
    id: "3",
    title: "Copper Kite",
    developer: "Northline Studio",
    genre: "Platformer",
    monthly_revenue_usd: 18000,
    monthly_downloads: 0,
    average_rating: 4,
  },
  {
    id: "4",
    title: "Salt Maze",
    developer: "Brick and Fern",
    genre: "Roguelike",
    monthly_revenue_usd: 9000,
    monthly_downloads: 10,
    average_rating: 3.4,
  },
];

describe("rating filters", () => {
  it("treats above 4 as strict and at least 4 as inclusive", () => {
    expect(countGames(games, { rating_above: 4 }).count).toBe(2);
    expect(countGames(games, { rating_at_least: 4 }).count).toBe(3);
    expect(
      searchGames(games, { rating_above: 4, limit: 20 }).games.map((game) => game.title),
    ).toEqual(["Lantern Circuit", "Paper Harbor"]);
  });
});

describe("searchGames", () => {
  it("returns every game tied for the highest revenue", () => {
    const result = searchGames(games, {
      sort_by: "monthly_revenue_usd",
      order: "desc",
      limit: 1,
    });
    expect(result.games.map((game) => game.title)).toEqual([
      "Lantern Circuit",
      "Paper Harbor",
    ]);
  });
});

describe("compareGames", () => {
  it("computes absolute and percent differences against the first title", () => {
    const result = compareGames(games, {
      titles: ["lantern circuit", "Paper Harbor"],
    });
    expect(result.notFound).toEqual([]);
    expect(result.differences).toEqual([
      {
        title: "Paper Harbor",
        versus: "Lantern Circuit",
        monthly_revenue_usd: { absolute: 0, pct: 0 },
        monthly_downloads: { absolute: -50, pct: -50 },
        average_rating: { absolute: -0.4, pct: -8.695652 },
      },
    ]);
  });

  it("returns notFound and substring suggestions without inventing the missing title", () => {
    const result = compareGames(games, {
      titles: ["Lantern Circuit", "Lantern"],
    });
    expect(result.notFound).toEqual(["Lantern"]);
    expect(result.suggestions).toEqual([
      { query: "Lantern", titles: ["Lantern Circuit"] },
    ]);
    expect(result.games.map((game) => game.title)).toEqual(["Lantern Circuit"]);
    expect(result).not.toHaveProperty("differences");
  });

  it("returns a null percent when the baseline is zero", () => {
    const result = compareGames(games, {
      titles: ["Copper Kite", "Salt Maze"],
    });
    expect(result.differences?.[0].monthly_downloads).toEqual({
      absolute: 10,
      pct: null,
    });
  });
});

describe("aggregateGames", () => {
  it("rounds an average that would otherwise be a binary float", () => {
    const result = aggregateGames(
      [
        { ...games[3], average_rating: 4.3 },
        { ...games[3], id: "5", title: "Moss Relay", average_rating: 3.4 },
      ],
      { metric: "average_rating", op: "avg" },
    );
    expect(result.value).toBe(3.85);
  });

  it("averages rating per genre", () => {
    const result = aggregateGames(games, {
      metric: "average_rating",
      op: "avg",
      group_by: "genre",
    });
    expect(result.groups).toEqual([
      { key: "Puzzle", value: 4.4, count: 2 },
      { key: "Platformer", value: 4, count: 1 },
      { key: "Roguelike", value: 3.4, count: 1 },
    ]);
  });
});
