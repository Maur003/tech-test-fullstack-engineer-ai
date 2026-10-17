import { tool } from "ai";
import { z } from "zod";

import { MAX_TOOL_ROWS, aggregateGames, compareGames, countGames, searchGames } from "@/features/games/domain/queries";
import { gamesRepository } from "@/features/games/server/repository";

const filterShape = {
  genre: z.string().optional().describe("Exact genre, case-insensitive"),
  developer: z
    .string()
    .optional()
    .describe("Exact developer, case-insensitive"),
  rating_above: z
    .number()
    .optional()
    .describe("Strict greater-than filter on average_rating. Above 4 means 4."),
  rating_at_least: z
    .number()
    .optional()
    .describe("Inclusive filter on average_rating. At least 4 means 4."),
};

export const searchGamesSchema = z.object({
  ...filterShape,
  sort_by: z
    .enum([
      "title",
      "developer",
      "genre",
      "monthly_revenue_usd",
      "monthly_downloads",
      "average_rating",
    ])
    .optional()
    .describe("Field to sort by. Default title."),
  order: z.enum(["asc", "desc"]).optional().describe("Sort direction. Default asc."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_TOOL_ROWS)
    .optional()
    .describe("Max rows, 1-20. Default 10. Revenue ties for first are not cut."),
});

export const countGamesSchema = z.object(filterShape);

export const compareGamesSchema = z.object({
  titles: z
    .array(z.string().min(1))
    .min(2)
    .max(4)
    .describe("2 to 4 exact titles, case-insensitive"),
});

export const aggregateGamesSchema = z.object({
  metric: z.enum([
    "monthly_revenue_usd",
    "monthly_downloads",
    "average_rating",
  ]),
  op: z.enum(["sum", "avg", "min", "max"]),
  group_by: z.enum(["genre", "developer"]).optional(),
});

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
