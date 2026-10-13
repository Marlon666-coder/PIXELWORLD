"use client";

import { useState } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { retryPosterCleanup } from "@/lib/actions/competitions";

const MESSAGES: Record<string, string> = {
  created: "Quest saved. Published quests appear in the public gallery immediately.",
  updated: "Changes saved.",
  deleted: "Quest deleted.",
};

/** Result banner shown after create/update/delete redirects, including partial-failure recovery. */
export function NoticeBanner({ notice, orphanPath }: { notice: string; orphanPath: string | null }) {
  const [cleanup, setCleanup] = useState<"idle" | "working" | "done" | "failed">("idle");
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const message = MESSAGES[notice];
  if (!message) return null;

  if (orphanPath && cleanup !== "done") {
    return (
      <div role="status" className="panel flex flex-col gap-3 border-l-4 border-neon-magenta p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-3 text-sm">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-neon-magenta" aria-hidden="true" />
          <span>
            The quest was deleted, but its poster file <code className="font-mono text-xs text-mist">{orphanPath}</code> could not be
            removed.
            {cleanupError && <span className="mt-1 block text-danger">{cleanupError}</span>}
          </span>
        </p>
        <button
          type="button"
          className="btn btn-secondary btn-sm shrink-0"
          disabled={cleanup === "working"}
          onClick={async () => {
            setCleanup("working");
            const result = await retryPosterCleanup(orphanPath);
            if (result.ok) setCleanup("done");
            else {
              setCleanup("failed");
              setCleanupError(result.error);
            }
          }}
        >
          {cleanup === "working" ? "Retrying…" : "Retry poster cleanup"}
        </button>
      </div>
    );
  }

  return (
    <div role="status" className="panel flex items-center gap-3 border-l-4 border-neon-green p-4 text-sm">
      <CircleCheck className="size-5 shrink-0 text-neon-green" aria-hidden="true" />
      {cleanup === "done" ? "Quest deleted and its poster file removed." : message}
    </div>
  );
}
