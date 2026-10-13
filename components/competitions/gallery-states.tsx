import Link from "next/link";
import { Ghost, SearchX } from "lucide-react";
import { GALLERY_PAGE_SIZE } from "@/lib/config";
import { RetryButton } from "./retry-button";

export const GALLERY_GRID = "grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function GallerySkeleton({ count = GALLERY_PAGE_SIZE }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading competitions" className="mt-10">
      <div className="skeleton mb-6 h-4 w-48" />
      <ul className={GALLERY_GRID}>
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="quest-card pointer-events-none flex flex-col">
            <div className="skeleton aspect-[4/5]" />
            <div className="space-y-3 p-5">
              <div className="skeleton h-5 w-4/5" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading competitions…</span>
    </div>
  );
}

function StatePanel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="panel scanlines mt-10 flex flex-col items-center px-6 py-16 text-center sm:py-20">
      <div className="pixel-border flex size-16 items-center justify-center bg-void-800 text-neon-violet">{icon}</div>
      <h3 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{title}</h3>
      <div className="mt-3 max-w-md text-mist">{children}</div>
    </div>
  );
}

export function EmptyArchive() {
  return (
    <StatePanel icon={<Ghost className="size-7" aria-hidden="true" />} title="NO QUESTS FOUND">
      <p>Your next adventure hasn&apos;t been uploaded yet.</p>
      <p className="mt-2 text-sm text-mist-dim">New competitions appear here the moment an administrator publishes them.</p>
    </StatePanel>
  );
}

export function NoMatches() {
  return (
    <StatePanel icon={<SearchX className="size-7" aria-hidden="true" />} title="NO MATCHING QUESTS">
      <p>No published competitions match these filters.</p>
      <Link href="/#explore" scroll={false} className="btn btn-secondary mt-6">
        Clear filters
      </Link>
    </StatePanel>
  );
}

export function PageOutOfRange({ firstPageHref }: { firstPageHref: string }) {
  return (
    <StatePanel icon={<SearchX className="size-7" aria-hidden="true" />} title="END OF THE MAP">
      <p>This page is past the last quest.</p>
      <Link href={firstPageHref} className="btn btn-secondary mt-6">
        Back to page 1
      </Link>
    </StatePanel>
  );
}

export function GalleryError({ message }: { message: string }) {
  return (
    <div role="alert" className="panel mt-10 flex flex-col items-center border-l-4 border-danger px-6 py-14 text-center">
      <p className="hud-label text-danger">Connection lost</p>
      <h3 className="mt-3 font-display text-3xl font-bold">SIGNAL INTERRUPTED</h3>
      <p className="mt-3 max-w-md text-mist">{message}</p>
      <RetryButton className="mt-6" />
    </div>
  );
}

export function SetupNotice({ problems }: { problems?: string[] }) {
  return (
    <div role="alert" className="panel mt-10 px-6 py-10 sm:px-10">
      <p className="hud-label text-neon-magenta">Setup required</p>
      <h3 className="mt-3 font-display text-3xl font-bold">CONNECT SUPABASE</h3>
      <p className="mt-3 max-w-2xl text-mist">
        This deployment is missing its Supabase configuration, so competitions cannot be loaded. Set the environment
        variables from <code className="font-mono text-ink">.env.example</code> and redeploy (see the README).
      </p>
      {problems && problems.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 font-mono text-sm text-mist">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
