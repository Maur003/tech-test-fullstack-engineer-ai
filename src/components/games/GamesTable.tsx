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
  const [sortKey, setSortKey] = useState<SortKey>("monthly_revenue_usd");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

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
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Genre" className="flex flex-wrap gap-2">
        {["all", ...genres].map((item) => {
          const selected = genre === item;
          return (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setGenre(item)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                selected
                  ? "bg-amber-400 text-ink"
                  : "border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10"
              }`}
            >
              {item === "all" ? "All genres" : item}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-12 text-center text-stone-400">
          No games match this filter.
        </p>
      ) : (
        <>
        <ul className="flex flex-col gap-3 md:hidden">
          {rows.map((game, index) => (
            <li
              key={game.id}
              className="animate-rise rounded-2xl border border-white/10 bg-panel/80 p-4"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{game.title}</p>
                  <p className="text-sm text-stone-400">{game.developer}</p>
                </div>
                <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-stone-200">{game.genre}</span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-stone-500">Revenue</dt>
                  <dd className="tabular-nums">{money.format(game.monthly_revenue_usd)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Downloads</dt>
                  <dd className="tabular-nums">{counts.format(game.monthly_downloads)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Rating</dt>
                  <dd className="tabular-nums">{game.average_rating.toFixed(1)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="rounded-full border border-white/10 px-3 py-1 text-xs transition hover:bg-white/10"
                  onClick={() => onEdit(game)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-full border border-rose-400/30 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/20"
                  onClick={() => onDelete(game)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-panel/80 shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:block">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Indie game catalog</caption>
            <thead className="text-xs uppercase tracking-wide text-stone-400">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} scope="col" aria-sort={ariaSort(sortKey, order, column.key)}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-1 px-4 py-3 text-left font-medium transition hover:text-white"
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                      <span aria-hidden="true" className={sortKey === column.key ? "text-amber-300" : "opacity-0"}>
                        {order === "asc" ? "↑" : "↓"}
                      </span>
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((game, index) => (
                <tr
                  key={game.id}
                  className="animate-rise border-t border-white/5 transition hover:bg-white/[0.03]"
                  style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
                >
                  <td className="px-4 py-3 font-medium text-white">{game.title}</td>
                  <td className="px-4 py-3 text-stone-300">{game.developer}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-stone-200">
                      {game.genre}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-stone-200">
                    {money.format(game.monthly_revenue_usd)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-stone-300">
                    {counts.format(game.monthly_downloads)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 tabular-nums">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full bg-amber-400"
                          style={{ width: `${(game.average_rating / 5) * 100}%` }}
                        />
                      </span>
                      {game.average_rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-white/10 px-3 py-1 text-xs transition hover:bg-white/10"
                        onClick={() => onEdit(game)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-400/30 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/20"
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
        </>
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
