import { tool } from "ai";

import { gamesRepository } from "./repository";
import {
  aggregateGames,
  aggregateGamesSchema,
  compareGames,
  compareGamesSchema,
  countGames,
  countGamesSchema,
  searchGames,
  searchGamesSchema,
} from "./tools";

export function createGameTools() {
  return {
    search_games: tool({
      description:
        "Search the catalog. rating_above is strict (>). rating_at_least is inclusive (>=). Results are capped at 20 rows. When sorting monthly_revenue_usd desc, every game tied for the highest revenue is included. Does not invent games.",
      inputSchema: searchGamesSchema,
      execute: async (input) => searchGames(await gamesRepository.list(), input),
    }),
    count_games: tool({
      description:
        "Count catalog games. rating_above is strict (>). rating_at_least is inclusive (>=). Use rating_above: 4 for 'above 4' and rating_at_least: 4 for 'at least 4'.",
      inputSchema: countGamesSchema,
      execute: async (input) => countGames(await gamesRepository.list(), input),
    }),
    compare_games: tool({
      description:
        "Compare 2 to 4 games by exact title (case-insensitive). Returns rows plus absolute and percent differences versus the first title. If a title is missing, returns notFound and suggestions and does not invent stats.",
      inputSchema: compareGamesSchema,
      execute: async (input) => compareGames(await gamesRepository.list(), input),
    }),
    aggregate_games: tool({
      description:
        "Aggregate one metric (monthly_revenue_usd, monthly_downloads, average_rating) with sum, avg, min, or max. Optional group_by genre or developer. All math is computed in code.",
      inputSchema: aggregateGamesSchema,
      execute: async (input) =>
        aggregateGames(await gamesRepository.list(), input),
    }),
  };
}
