"use client";

import { useMemo, useState } from "react";

import type { Game } from "@/lib/games/types";

type SortKey = keyof Omit<Game, "id">;
type Props = {
  games: Game[];
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
};

const columns: { key: SortKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "developer", label: "Developer" },
  { key: "genre", label: "Genre" },
  { key: "monthly_revenue_usd", label: "Revenue" },
  { key: "monthly_downloads", label: "Downloads" },
  { key: "average_rating", label: "Rating" },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const counts = new Intl.NumberFormat("en-US");

export function GamesTable({ games, onEdit, onDelete }: Props) {
  const [genre, setGenre] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const genres = useMemo(
    () => Array.from(new Set(games.map((game) => game.genre))).sort(),
    [games],
  );

  const rows = useMemo(() => {
    const filtered =
      genre === "all" ? games : games.filter((game) => game.genre === genre);
    return [...filtered].sort((left, right) => {
      const a = left[sortKey];
      const b = right[sortKey];
      const compared =
        typeof a === "string" ? a.localeCompare(b as string) : a - (b as number);
      return order === "asc" ? compared : -compared;
    });
  }, [games, genre, sortKey, order]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setOrder(key === "title" || key === "developer" || key === "genre" ? "asc" : "desc");
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex w-full max-w-xs flex-col gap-1 text-sm font-medium">
        Genre
        <select
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
          className="rounded-md border border-stone-300 bg-white px-3 py-2"
        >
          <option value="all">All genres</option>
          {genres.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-stone-600">
          No games match this filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-300 bg-white">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Indie game catalog</caption>
            <thead className="bg-stone-100 text-stone-700">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} scope="col" aria-sort={ariaSort(sortKey, order, column.key)}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left font-semibold hover:bg-stone-200"
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                      {sortKey === column.key ? (order === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((game) => (
                <tr key={game.id} className="border-t border-stone-200">
                  <td className="px-3 py-2 font-medium">{game.title}</td>
                  <td className="px-3 py-2">{game.developer}</td>
                  <td className="px-3 py-2">{game.genre}</td>
                  <td className="px-3 py-2">{money.format(game.monthly_revenue_usd)}</td>
                  <td className="px-3 py-2">{counts.format(game.monthly_downloads)}</td>
                  <td className="px-3 py-2">{game.average_rating.toFixed(1)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-stone-300 px-2 py-1"
                        onClick={() => onEdit(game)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-300 px-2 py-1 text-red-800"
                        onClick={() => onDelete(game)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ariaSort(
  sortKey: SortKey,
  order: "asc" | "desc",
  key: SortKey,
): "ascending" | "descending" | "none" {
  if (sortKey !== key) return "none";
  return order === "asc" ? "ascending" : "descending";
}
