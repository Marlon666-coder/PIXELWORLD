"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CircleCheck, LoaderCircle, Trash, TriangleAlert } from "lucide-react";
import { cleanupOrphanedPosters } from "@/lib/actions/competitions";
import type { CleanupSummary } from "@/lib/actions/types";
import { formatBytes } from "@/lib/utils";

export interface OrphanRow {
  path: string;
  size: number | null;
  createdLabel: string | null;
  isRecent: boolean;
}

export function StorageCleanup({ orphans }: { orphans: OrphanRow[] }) {
  const router = useRouter();
  const eligible = orphans.filter((orphan) => !orphan.isRecent);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(eligible.map((orphan) => orphan.path)));
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<CleanupSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (path: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const run = () =>
    startTransition(async () => {
      setError(null);
      const result = await cleanupOrphanedPosters(Array.from(selected));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.data);
      setSelected(new Set());
      router.refresh();
    });

  return (
    <div className="space-y-4">
      {summary && (
        <div role="status" className="panel space-y-1 border-l-4 border-neon-green p-4 text-sm">
          <p className="flex items-center gap-2">
            <CircleCheck className="size-4 text-neon-green" aria-hidden="true" />
            Removed {summary.removed.length} file(s).
          </p>
          {summary.skipped.length > 0 && <p className="text-mist">Skipped {summary.skipped.length} (still in use or too recent).</p>}
          {summary.failed.length > 0 && <p className="text-danger">Failed to remove {summary.failed.length}. Try again later.</p>}
        </div>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-danger">
          <TriangleAlert className="size-4" aria-hidden="true" />
          {error}
        </p>
      )}

      {orphans.length === 0 ? (
        <div className="panel p-6 text-sm text-mist">No orphaned poster files. Storage and the database are in sync.</div>
      ) : (
        <>
          <ul className="panel divide-y divide-white/5">
            {orphans.map((orphan) => (
              <li key={orphan.path} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={`Select ${orphan.path}`}
                  className="size-4 accent-[#2de2f5]"
                  disabled={orphan.isRecent || pending}
                  checked={selected.has(orphan.path)}
                  onChange={() => toggle(orphan.path)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-ink">{orphan.path}</p>
                  <p className="text-xs text-mist-dim">
                    {orphan.size !== null ? formatBytes(orphan.size) : "Unknown size"}
                    {orphan.createdLabel && ` · uploaded ${orphan.createdLabel}`}
                    {orphan.isRecent && " · less than an hour old (protected)"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-danger" disabled={pending || selected.size === 0} onClick={run}>
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Trash className="size-4" aria-hidden="true" />}
            Delete {selected.size} selected file(s)
          </button>
        </>
      )}
    </div>
  );
}
