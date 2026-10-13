import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, FileText, Layers, Plus, Radio } from "lucide-react";
import { AdminFilters } from "@/components/admin/admin-filters";
import { CompetitionTable } from "@/components/admin/competition-table";
import { NoticeBanner } from "@/components/admin/notice-banner";
import { StatCard } from "@/components/admin/stat-card";
import { PublicationBadge } from "@/components/competitions/badges";
import { GalleryError } from "@/components/competitions/gallery-states";
import { Pagination } from "@/components/competitions/pagination";
import { requireAdminPage } from "@/lib/auth/admin";
import { isCategory } from "@/lib/categories";
import { SITE_TIME_ZONE } from "@/lib/config";
import { sanitizeSearchTerm } from "@/lib/competitions/explorer-params";
import { getDashboardStats, listAdminCompetitions, type AdminFilters as AdminFilterValues } from "@/lib/competitions/queries";
import { isPosterPath } from "@/lib/images/poster-storage";
import { formatDate, formatDateTime } from "@/lib/time/format";

export const metadata: Metadata = { title: "Dashboard" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminDashboardPage(props: PageProps<"/admin">) {
  const { supabase } = await requireAdminPage("/admin");
  const params = await props.searchParams;

  const statusParam = first(params.status);
  const pageParam = Number.parseInt(first(params.page) ?? "1", 10);
  const filters: AdminFilterValues = {
    q: sanitizeSearchTerm(first(params.q) ?? ""),
    category: isCategory(first(params.category)) ? (first(params.category) as AdminFilterValues["category"]) : null,
    status: statusParam === "draft" || statusParam === "published" ? statusParam : null,
    page: Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1,
  };
  const notice = first(params.notice) ?? null;
  const orphanParam = first(params.orphan);
  const orphanPath = isPosterPath(orphanParam) ? orphanParam : null;

  const [stats, list] = await Promise.all([getDashboardStats(supabase), listAdminCompetitions(supabase, filters)]);

  const hrefFor = (page: number) => {
    const search = new URLSearchParams();
    if (filters.q) search.set("q", filters.q);
    if (filters.category) search.set("category", filters.category);
    if (filters.status) search.set("status", filters.status);
    if (page > 1) search.set("page", String(page));
    const query = search.toString();
    return `/admin${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="hud-label text-neon-cyan">Command center</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">DASHBOARD</h1>
        </div>
        <Link href="/admin/competitions/new" className="btn btn-primary">
          <Plus className="size-4" aria-hidden="true" />
          Create competition
        </Link>
      </div>

      {notice && <NoticeBanner notice={notice} orphanPath={orphanPath} />}

      {stats.ok ? (
        <>
          <section aria-label="Statistics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total" value={stats.data.total} icon={Layers} accent="violet" hint="All competitions" />
            <StatCard label="Published" value={stats.data.published} icon={Radio} accent="green" hint="Visible to the public" />
            <StatCard label="Drafts" value={stats.data.drafts} icon={FileText} accent="cyan" hint="Only visible to admins" />
            <StatCard label="Upcoming deadlines" value={stats.data.upcomingDeadlines} icon={CalendarClock} accent="magenta" hint="Published, still open" />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="next-deadlines" className="panel p-5">
              <h2 id="next-deadlines" className="hud-label text-ink">
                Next deadlines
              </h2>
              {stats.data.nextDeadlines.length === 0 ? (
                <p className="mt-4 text-sm text-mist">No upcoming registration deadlines.</p>
              ) : (
                <ul className="mt-4 divide-y divide-white/5">
                  {stats.data.nextDeadlines.map((competition) => (
                    <li key={competition.id} className="flex items-center justify-between gap-4 py-2.5">
                      <Link href={`/admin/competitions/${competition.id}/edit`} className="truncate text-sm hover:text-neon-cyan">
                        {competition.title}
                      </Link>
                      <span className="shrink-0 font-mono text-xs text-mist">
                        {formatDateTime(competition.registrationDeadline, SITE_TIME_ZONE)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-labelledby="recently-added" className="panel p-5">
              <h2 id="recently-added" className="hud-label text-ink">
                Recently added
              </h2>
              {stats.data.recentlyAdded.length === 0 ? (
                <p className="mt-4 text-sm text-mist">Nothing yet — create your first competition.</p>
              ) : (
                <ul className="mt-4 divide-y divide-white/5">
                  {stats.data.recentlyAdded.map((competition) => (
                    <li key={competition.id} className="flex items-center justify-between gap-4 py-2.5">
                      <Link href={`/admin/competitions/${competition.id}/edit`} className="truncate text-sm hover:text-neon-cyan">
                        {competition.title}
                      </Link>
                      <span className="flex shrink-0 items-center gap-3">
                        <PublicationBadge status={competition.status} />
                        <span className="font-mono text-xs text-mist-dim">{formatDate(competition.createdAt, SITE_TIME_ZONE)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : (
        <GalleryError message={stats.error} />
      )}

      <section aria-labelledby="manage-title" className="space-y-5">
        <h2 id="manage-title" className="font-display text-3xl font-bold">
          MANAGE COMPETITIONS
        </h2>
        <AdminFilters filters={filters} />
        {!list.ok ? (
          <GalleryError message={list.error} />
        ) : list.data.total === 0 ? (
          <div className="panel p-8 text-center text-mist">
            {filters.q || filters.category || filters.status ? (
              <p>No competitions match these filters.</p>
            ) : (
              <>
                <p>No competitions yet.</p>
                <Link href="/admin/competitions/new" className="btn btn-primary mt-5">
                  <Plus className="size-4" aria-hidden="true" />
                  Create the first one
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="hud-label">
              {list.data.total} {list.data.total === 1 ? "competition" : "competitions"}
            </p>
            <CompetitionTable competitions={list.data.items} />
            <Pagination page={list.data.page} pageCount={list.data.pageCount} hrefFor={hrefFor} label="Competition pages" />
          </>
        )}
      </section>
    </div>
  );
}
