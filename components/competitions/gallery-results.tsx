import { buildExplorerQuery, hasActiveFilters, type ExplorerFilters } from "@/lib/competitions/explorer-params";
import { listPublishedCompetitions } from "@/lib/competitions/queries";
import { readPublicEnv } from "@/lib/env";
import { CompetitionCard } from "./competition-card";
import { EmptyArchive, GALLERY_GRID, GalleryError, NoMatches, PageOutOfRange, SetupNotice } from "./gallery-states";
import { Pagination } from "./pagination";

export async function GalleryResults({ filters }: { filters: ExplorerFilters }) {
  const result = await listPublishedCompetitions(filters);

  if (!result.ok) {
    if (result.setupRequired) {
      const env = readPublicEnv();
      return <SetupNotice problems={env.ok ? [] : env.problems} />;
    }
    return <GalleryError message={result.error} />;
  }

  const { items, total, page, pageCount, pageSize } = result.data;
  if (total === 0) return hasActiveFilters(filters) ? <NoMatches /> : <EmptyArchive />;
  if (items.length === 0) return <PageOutOfRange firstPageHref={`/${buildExplorerQuery({ ...filters, page: 1 })}#explore`} />;

  const first = (page - 1) * pageSize + 1;
  const last = first + items.length - 1;

  return (
    <div className="mt-10">
      <p className="hud-label mb-6" aria-live="polite">
        Showing {first}–{last} of {total} {total === 1 ? "quest" : "quests"}
      </p>
      <ul className={GALLERY_GRID} data-testid="competition-grid">
        {items.map((competition, index) => (
          <li key={competition.id} className="animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
            <CompetitionCard competition={competition} priority={page === 1 && index < 2} />
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        pageCount={pageCount}
        label="Quest pages"
        hrefFor={(target) => `/${buildExplorerQuery({ ...filters, page: target })}#explore`}
      />
    </div>
  );
}
