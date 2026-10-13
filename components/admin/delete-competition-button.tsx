"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { CircleAlert, LoaderCircle, Trash, X } from "lucide-react";
import { deleteCompetition } from "@/lib/actions/competitions";

export function DeleteCompetitionButton({ id, title, compact = false }: { id: string; title: string; compact?: boolean }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const open = () => {
    setError(null);
    dialogRef.current?.showModal();
  };
  const close = () => {
    if (!pending) dialogRef.current?.close();
  };

  const confirm = () => {
    startTransition(async () => {
      const result = await deleteCompetition(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      dialogRef.current?.close();
      const params = new URLSearchParams({ notice: "deleted" });
      if (result.data.orphanedPosterPath) params.set("orphan", result.data.orphanedPosterPath);
      router.replace(`/admin?${params.toString()}`);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="btn btn-ghost btn-sm text-danger hover:text-danger"
        aria-label={compact ? `Delete ${title}` : undefined}
      >
        <Trash className="size-4" aria-hidden="true" />
        {!compact && "Delete"}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="panel m-auto w-[min(92vw,30rem)] p-0 text-left text-ink backdrop:bg-void-950/85"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="font-display text-2xl font-bold">
              Delete quest?
            </h2>
            <button type="button" onClick={close} className="btn btn-ghost btn-sm" aria-label="Cancel deletion" disabled={pending}>
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-mist">
            <strong className="text-ink">“{title}”</strong> and its poster will be permanently removed from PIXEL QUEST. This cannot be undone.
          </p>
          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-danger">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} className="btn btn-secondary" disabled={pending}>
              Cancel
            </button>
            <button type="button" onClick={confirm} className="btn btn-danger" disabled={pending}>
              {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Trash className="size-4" aria-hidden="true" />}
              {pending ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
