"use client";

import { useCallback, useEffect, useState } from "react";

import type { Game } from "@/features/games/domain/types";

import { ConfirmDialog } from "./ConfirmDialog";
import { GameFormDialog } from "./GameFormDialog";
import { GamesTable } from "./GamesTable";

export function GamesDashboard() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Game | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Game | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/games/${pendingDelete.id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        setActionError("Could not delete the game.");
        return;
      }
      setActionError(null);
      await load();
    } catch {
      setActionError("Could not reach the server. Try again.");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  return (
    <section className="animate-rise flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-300/80">Dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Catalog</h1>
          <p className="mt-1 max-w-xl text-sm text-stone-400">
            One monthly snapshot per fictional title. Sort, filter, and edit without leaving the page.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-ink shadow-[0_8px_30px_rgba(251,191,36,0.25)] transition hover:-translate-y-0.5 hover:bg-amber-300"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Add game
        </button>
      </div>

      {loadError ? (
        <div role="alert" className="animate-pop rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-rose-100">
          <p>{loadError}</p>
          <button type="button" className="mt-2 text-sm underline" onClick={() => void load()}>
            Try again
          </button>
        </div>
      ) : null}
      {actionError ? (
        <div role="alert" className="animate-pop flex items-start justify-between gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-rose-100">
          <p>{actionError}</p>
          <button type="button" className="text-sm underline" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
      {games === null && !loadError ? <TableSkeleton /> : null}
      {games && games.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-12 text-center text-stone-400">
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
          onDelete={setPendingDelete}
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
      <ConfirmDialog
        title={pendingDelete?.title ?? null}
        busy={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}

function TableSkeleton() {
  return (
    <div>
      <p className="sr-only">Loading games...</p>
      <div className="space-y-2 rounded-2xl border border-white/10 bg-panel p-4" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-10 animate-shimmer rounded-lg bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.1),rgba(255,255,255,0.04))] bg-[length:200%_100%]"
        />
      ))}
      </div>
    </div>
  );
}
