"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { Game, GameInput } from "@/lib/games/types";

type Props = {
  open: boolean;
  game: Game | null;
  onClose: () => void;
  onSaved: () => void;
};

const empty: GameInput = {
  title: "",
  developer: "",
  genre: "",
  monthly_revenue_usd: 0,
  monthly_downloads: 0,
  average_rating: 0,
};

export function GameFormDialog({ open, game, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [fields, setFields] = useState<GameInput>(empty);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(
        game
          ? {
              title: game.title,
              developer: game.developer,
              genre: game.genre,
              monthly_revenue_usd: game.monthly_revenue_usd,
              monthly_downloads: game.monthly_downloads,
              average_rating: game.average_rating,
            }
          : empty,
      );
      setErrors({});
      setFormError(null);
    }
  }, [open, game]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setErrors({});

    const payload: GameInput = {
      title: fields.title,
      developer: fields.developer,
      genre: fields.genre,
      monthly_revenue_usd: Number(fields.monthly_revenue_usd),
      monthly_downloads: Number(fields.monthly_downloads),
      average_rating: Number(fields.average_rating),
    };

    const response = await fetch(game ? `/api/games/${game.id}` : "/api/games", {
      method: game ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 400) {
      const body = (await response.json()) as {
        error?: string;
        fields?: Record<string, string[]>;
      };
      setErrors(body.fields ?? {});
      setFormError(body.error ?? "Could not save the game.");
      setSaving(false);
      return;
    }

    if (!response.ok) {
      setFormError("Could not save the game.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-[min(32rem,calc(100%-2rem))] rounded-lg border border-stone-300 bg-white p-0 text-stone-900 shadow-xl"
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5">
        <h2 id={titleId} className="text-lg font-semibold">
          {game ? "Edit game" : "Add game"}
        </h2>
        {formError ? (
          <p role="alert" className="text-sm text-red-700">
            {formError}
          </p>
        ) : null}
        <Field
          label="Title"
          name="title"
          value={fields.title}
          errors={errors.title}
          onChange={(title) => setFields((current) => ({ ...current, title }))}
        />
        <Field
          label="Developer"
          name="developer"
          value={fields.developer}
          errors={errors.developer}
          onChange={(developer) =>
            setFields((current) => ({ ...current, developer }))
          }
        />
        <Field
          label="Genre"
          name="genre"
          value={fields.genre}
          errors={errors.genre}
          onChange={(genre) => setFields((current) => ({ ...current, genre }))}
        />
        <Field
          label="Monthly revenue (USD)"
          name="monthly_revenue_usd"
          type="number"
          min={0}
          step={1}
          value={String(fields.monthly_revenue_usd)}
          errors={errors.monthly_revenue_usd}
          onChange={(value) =>
            setFields((current) => ({
              ...current,
              monthly_revenue_usd: Number(value),
            }))
          }
        />
        <Field
          label="Monthly downloads"
          name="monthly_downloads"
          type="number"
          min={0}
          step={1}
          value={String(fields.monthly_downloads)}
          errors={errors.monthly_downloads}
          onChange={(value) =>
            setFields((current) => ({
              ...current,
              monthly_downloads: Number(value),
            }))
          }
        />
        <Field
          label="Average rating"
          name="average_rating"
          type="number"
          min={0}
          max={5}
          step={0.1}
          value={String(fields.average_rating)}
          errors={errors.average_rating}
          onChange={(value) =>
            setFields((current) => ({
              ...current,
              average_rating: Number(value),
            }))
          }
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-amber-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  errors,
  type = "text",
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  type?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-invalid={Boolean(errors?.length)}
        aria-describedby={errors?.length ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-stone-300 px-3 py-2"
      />
      {errors?.length ? (
        <span id={errorId} className="text-red-700">
          {errors.join(" ")}
        </span>
      ) : null}
    </label>
  );
}
