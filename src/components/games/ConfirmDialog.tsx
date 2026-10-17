"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
  title: string | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ title, busy, onCancel, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const open = title !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      className="w-[min(26rem,calc(100%-2rem))]"
      onClose={onCancel}
    >
      <div className="rounded-2xl border border-white/10 bg-panel p-5 text-stone-100 shadow-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-rose-300">Remove from catalog</p>
        <h2 id={headingId} className="mt-2 text-lg font-semibold">
          Delete {title ?? "this game"}?
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          This takes the title out of the catalog. The chat will no longer be able to look it up.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm text-stone-300 transition hover:bg-white/5"
            onClick={onCancel}
            disabled={busy}
          >
            Keep it
          </button>
          <button
            type="button"
            className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-400 disabled:opacity-60"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Deleting..." : "Delete game"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
