import { Suspense } from "react";
import { buildExplorerQuery, type ExplorerFilters } from "@/lib/competitions/explorer-params";
import { ExplorerControls } from "./explorer-controls";
import { GalleryResults } from "./gallery-results";
import { GallerySkeleton } from "./gallery-states";
import { PixelHorizon } from "./pixel-horizon";

export function ExplorerSection({ filters }: { filters: ExplorerFilters }) {
  return (
    <section id="explore" aria-labelledby="explore-title" className="relative z-10 overflow-x-clip bg-void-950">
      <PixelHorizon />
      <div
        aria-hidden="true"
        className="pixel-grid-bg pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_70%,transparent)] opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgb(155_107_255/0.14),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-24 sm:px-8 sm:pt-20">
        <header className="max-w-2xl">
          <p className="hud-label text-neon-cyan">Quest board</p>
          <h2 id="explore-title" className="mt-3 font-display text-4xl leading-none font-bold sm:text-6xl">
            FIND YOUR NEXT QUEST
          </h2>
          <p className="mt-5 text-base leading-relaxed text-mist sm:text-lg">
            Explore opportunities, discover new challenges, and find your next competition.
          </p>
        </header>

        <ExplorerControls filters={filters} />

        <Suspense key={buildExplorerQuery(filters) || "all"} fallback={<GallerySkeleton />}>
          <GalleryResults filters={filters} />
        </Suspense>
      </div>
    </section>
  );
}
