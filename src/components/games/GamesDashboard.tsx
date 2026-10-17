"use client";

import { useCallback, useEffect, useState } from "react";

import type { Game } from "@/lib/games/types";

import { GameFormDialog } from "./GameFormDialog";
import { GamesTable } from "./GamesTable";

export function GamesDashboard() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/games", { cache: "no-store" });
      if (!response.ok) throw new Error("Request failed");
      setGames((await response.json()) as Game[]);
      setLoadError(null);
    } catch {
      setLoadError("Could not load the catalog.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete(game: Game) {
    if (!window.confirm(`Delete ${game.title}?`)) return;
    try {
      const response = await fetch(`/api/games/${game.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        setActionError("Could not delete the game.");
        return;
      }
      setActionError(null);
      await load();
    } catch {
      setActionError("Could not reach the server. Try again.");
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
          <p className="text-sm text-stone-600">
            Fictional indie games. One monthly snapshot per title.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-amber-800 px-3 py-2 text-sm font-medium text-white"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Add game
        </button>
      </div>

      {loadError ? (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-4 py-4 text-red-800">
          <p>{loadError}</p>
          <button type="button" className="mt-2 underline" onClick={() => void load()}>
            Try again
          </button>
        </div>
      ) : null}
      {actionError ? (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-800">
          <p>{actionError}</p>
          <button type="button" className="underline" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
      {games === null && !loadError ? (
        <p className="rounded-md bg-white px-4 py-8 text-stone-600">Loading games...</p>
      ) : null}
      {games && games.length === 0 ? (
        <p className="rounded-md border border-dashed border-stone-300 bg-white px-4 py-8 text-center text-stone-600">
          No games yet. Add the first one.
        </p>
      ) : null}
      {games && games.length > 0 ? (
        <GamesTable
          games={games}
          onEdit={(game) => {
            setEditing(game);
            setDialogOpen(true);
          }}
          onDelete={(game) => void onDelete(game)}
        />
      ) : null}

      <GameFormDialog
        open={dialogOpen}
        game={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setActionError(null);
          void load();
        }}
        onActionError={setActionError}
      />
    </section>
  );
}
