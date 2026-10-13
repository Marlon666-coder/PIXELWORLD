import { ExternalLink, Info, TriangleAlert } from "lucide-react";
import type { DeadlineStatus } from "@/lib/competitions/deadline";
import { displayHost, normalizeExternalUrl } from "@/lib/security/urls";

/**
 * Registration call-to-action. Links are re-validated at render time (http/https only)
 * and open in a new tab with rel="noopener noreferrer" so the destination cannot
 * control this page.
 */
export function RegisterPanel({ url, deadlineStatus }: { url: string | null; deadlineStatus: DeadlineStatus }) {
  const safeUrl = normalizeExternalUrl(url);

  if (!safeUrl) {
    return (
      <div className="panel flex gap-3 p-5" data-testid="registration-unavailable">
        <Info className="mt-0.5 size-5 shrink-0 text-mist" aria-hidden="true" />
        <div>
          <p className="font-semibold">Registration link unavailable</p>
          <p className="mt-1 text-sm text-mist">
            The organizer hasn&apos;t shared an online registration link yet. Check the poster for registration details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deadlineStatus === "closed" && (
        <p className="flex items-start gap-2 text-sm text-neon-magenta">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          The registration deadline has passed. The organizer may no longer accept entries.
        </p>
      )}
      <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full py-4">
        Register for competition
        <ExternalLink className="size-4" aria-hidden="true" />
        <span className="sr-only">(opens {displayHost(safeUrl)} in a new tab)</span>
      </a>
      <p className="text-center text-xs text-mist-dim">
        Opens <span className="font-mono text-mist">{displayHost(safeUrl)}</span> in a new tab
      </p>
    </div>
  );
}
