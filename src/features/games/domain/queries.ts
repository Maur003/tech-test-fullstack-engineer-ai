import type { Game } from "./types";

export const MAX_TOOL_ROWS = 20;

export type CountGamesInput = {
  genre?: string;
  developer?: string;
  rating_above?: number;
  rating_at_least?: number;
};

export type SearchGamesInput = CountGamesInput & {
  sort_by?:
    | "title"
    | "developer"
    | "genre"
    | "monthly_revenue_usd"
    | "monthly_downloads"
    | "average_rating";
  order?: "asc" | "desc";
  limit?: number;
};

export type CompareGamesInput = {
  titles: string[];
};

export type AggregateGamesInput = {
  metric: "monthly_revenue_usd" | "monthly_downloads" | "average_rating";
  op: "sum" | "avg" | "min" | "max";
  group_by?: "genre" | "developer";
};

type Filters = {
  genre?: string;
  developer?: string;
  rating_above?: number;
  rating_at_least?: number;
};

function sameText(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function filterGames(games: Game[], filters: Filters): Game[] {
  return games.filter((game) => {
    if (filters.genre && !sameText(game.genre, filters.genre)) return false;
    if (filters.developer && !sameText(game.developer, filters.developer)) {
      return false;
    }
    if (
      filters.rating_above !== undefined &&
      !(game.average_rating > filters.rating_above)
    ) {
      return false;
    }
    if (
      filters.rating_at_least !== undefined &&
      !(game.average_rating >= filters.rating_at_least)
    ) {
      return false;
    }
    return true;
  });
}

function sortValue(game: Game, sortBy: NonNullable<SearchGamesInput["sort_by"]>) {
  return game[sortBy];
}

export function searchGames(games: Game[], input: SearchGamesInput) {
  const matched = filterGames(games, input);
  const sortBy = input.sort_by ?? "title";
  const order = input.order ?? "asc";
  const sorted = [...matched].sort((left, right) => {
    const a = sortValue(left, sortBy);
    const b = sortValue(right, sortBy);
    const compared =
      typeof a === "string" ? a.localeCompare(b as string) : a - (b as number);
    return order === "desc" ? -compared : compared;
  });

  let limit = input.limit ?? 10;
  if (sortBy === "monthly_revenue_usd" && order === "desc" && sorted.length > 0) {
    const topRevenue = sorted[0].monthly_revenue_usd;
    const tied = sorted.filter(
      (game) => game.monthly_revenue_usd === topRevenue,
    ).length;
    limit = Math.max(limit, tied);
  }
  limit = Math.min(limit, MAX_TOOL_ROWS);
  const rows = sorted.slice(0, limit);

  return {
    games: rows,
    matched: matched.length,
    truncated: sorted.length > rows.length,
  };
}

export function countGames(games: Game[], input: CountGamesInput) {
  return { count: filterGames(games, input).length };
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function delta(baseline: number, value: number) {
  const absolute = round6(value - baseline);
  return {
    absolute,
    pct: baseline === 0 ? null : round6((absolute / baseline) * 100),
  };
}

export function compareGames(games: Game[], input: CompareGamesInput) {
  const found: Game[] = [];
  const notFound: string[] = [];

  for (const title of input.titles) {
    const match = games.find((game) => sameText(game.title, title));
    if (match) found.push(match);
    else notFound.push(title);
  }

  const suggestions = notFound.map((query) => {
    const needle = query.trim().toLowerCase();
    return {
      query,
      titles: games
        .filter((game) => game.title.toLowerCase().includes(needle))
        .map((game) => game.title)
        .slice(0, MAX_TOOL_ROWS),
    };
  });

  if (notFound.length > 0) {
    return { notFound, suggestions, games: found };
  }

  const baseline = found[0];
  const differences = found.slice(1).map((game) => ({
    title: game.title,
    versus: baseline.title,
    monthly_revenue_usd: delta(
      baseline.monthly_revenue_usd,
      game.monthly_revenue_usd,
    ),
    monthly_downloads: delta(
      baseline.monthly_downloads,
      game.monthly_downloads,
    ),
    average_rating: delta(baseline.average_rating, game.average_rating),
  }));

  return { notFound, suggestions, games: found, differences };
}

function reduceMetric(values: number[], op: AggregateGamesInput["op"]): number | null {
  if (values.length === 0) return null;
  if (op === "sum") return values.reduce((sum, value) => sum + value, 0);
  if (op === "min") return Math.min(...values);
  if (op === "max") return Math.max(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(average * 100) / 100;
}

export function aggregateGames(games: Game[], input: AggregateGamesInput) {
  if (!input.group_by) {
    return {
      metric: input.metric,
      op: input.op,
      value: reduceMetric(
        games.map((game) => game[input.metric]),
        input.op,
      ),
      count: games.length,
    };
  }

  const groups = new Map<string, number[]>();
  for (const game of games) {
    const key = game[input.group_by];
    const bucket = groups.get(key) ?? [];
    bucket.push(game[input.metric]);
    groups.set(key, bucket);
  }

  return {
    metric: input.metric,
    op: input.op,
    group_by: input.group_by,
    groups: Array.from(groups.entries()).map(([key, values]) => ({
      key,
      value: reduceMetric(values, input.op),
      count: values.length,
    })),
  };
}
