import "server-only";

import { ADMIN_PAGE_SIZE, GALLERY_PAGE_SIZE } from "@/lib/config";
import { getPublicEnv, isMissingConfigurationError } from "@/lib/env";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import type { CompetitionCategory } from "@/lib/categories";
import type { CompetitionStatus } from "@/lib/validation/competition";
import { getDeadlineFilter } from "./deadline";
import { getPageCount, getPageRange, sanitizeSearchTerm, type ExplorerFilters, type SortValue } from "./explorer-params";
import { toCompetition, type Competition } from "./model";

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: string; setupRequired?: boolean };

export interface CompetitionPage {
  items: Competition[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

const SUMMARY_COLUMNS =
  "id,title,organizer,category,poster_path,poster_width,poster_height,registration_deadline,event_date,status,created_at,updated_at";

const DETAIL_COLUMNS =
  "id,title,organizer,category,poster_path,poster_width,poster_height,registration_deadline,event_date,status,created_at,updated_at,description,registration_url";

/** PostgREST answers 416 / PGRST103 when the requested page is past the end. */
const RANGE_NOT_SATISFIABLE = "PGRST103";

function failure(error: unknown, fallback: string): { ok: false; error: string; setupRequired?: boolean } {
  if (isMissingConfigurationError(error)) {
    return { ok: false, error: error.message, setupRequired: true };
  }
  return { ok: false, error: fallback };
}

function logQueryError(scope: string, error: { message?: string; code?: string } | null) {
  if (error) {
    console.error(`[queries] ${scope} failed`, { code: error.code, message: error.message });
  }
}

// The filter helpers are written against a minimal structural interface so they work for
// both the public and the user-scoped client without fighting PostgREST's generic types.
interface FilterableQuery<Self> {
  or(filters: string): Self;
  eq(column: string, value: string): Self;
  is(column: string, value: null): Self;
  gt(column: string, value: string): Self;
  lte(column: string, value: string): Self;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): Self;
}

function applySearch<Q extends FilterableQuery<Q>>(query: Q, rawTerm: string): Q {
  const term = sanitizeSearchTerm(rawTerm);
  if (!term) return query;
  const pattern = `"%${term}%"`;
  return query.or(`title.ilike.${pattern},organizer.ilike.${pattern}`);
}

function applyDeadlineStatus<Q extends FilterableQuery<Q>>(query: Q, filters: ExplorerFilters, now: Date): Q {
  if (!filters.status) return query;
  const filter = getDeadlineFilter(filters.status, now);
  if (filter.kind === "is-null") return query.is("registration_deadline", null);
  let next = query;
  if (filter.gt) next = next.gt("registration_deadline", filter.gt);
  if (filter.lte) next = next.lte("registration_deadline", filter.lte);
  return next;
}

function applySort<Q extends FilterableQuery<Q>>(query: Q, sort: SortValue): Q {
  switch (sort) {
    case "oldest":
      return query.order("created_at", { ascending: true }).order("id", { ascending: true });
    case "title":
      return query.order("title", { ascending: true }).order("created_at", { ascending: false });
    case "deadline":
      // Computed fields (see migration): upcoming soonest first, then recently closed, then no deadline.
      return query
        .order("deadline_rank", { ascending: true })
        .order("deadline_distance", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
    case "newest":
    default:
      return query.order("created_at", { ascending: false }).order("id", { ascending: false });
  }
}

/** Published competitions for the public explorer (anonymous client → RLS returns published rows only). */
export async function listPublishedCompetitions(
  filters: ExplorerFilters,
  now: Date = new Date(),
): Promise<QueryResult<CompetitionPage>> {
  try {
    const { supabaseUrl } = getPublicEnv();
    const supabase = createPublicSupabaseClient();
    const pageSize = GALLERY_PAGE_SIZE;
    const { from, to } = getPageRange(filters.page, pageSize);

    let query = supabase.from("competitions").select(SUMMARY_COLUMNS, { count: "exact" }).eq("status", "published");
    query = applySearch(query, filters.q);
    if (filters.category) query = query.eq("category", filters.category);
    query = applyDeadlineStatus(query, filters, now);
    query = applySort(query, filters.sort);

    const { data, error, count } = await query.range(from, to);

    if (error?.code === RANGE_NOT_SATISFIABLE) {
      return { ok: true, data: { items: [], total: count ?? 0, page: filters.page, pageCount: 1, pageSize } };
    }
    if (error) {
      logQueryError("listPublishedCompetitions", error);
      return { ok: false, error: "We couldn't reach the quest archive. Please try again." };
    }

    const total = count ?? data.length;
    return {
      ok: true,
      data: {
        items: data.map((row) => toCompetition(row, supabaseUrl, now)),
        total,
        page: filters.page,
        pageCount: getPageCount(total, pageSize),
        pageSize,
      },
    };
  } catch (error) {
    return failure(error, "We couldn't reach the quest archive. Please try again.");
  }
}

/** A single published competition, or null when it does not exist / is not published. */
export async function getPublishedCompetition(id: string, now: Date = new Date()): Promise<QueryResult<Competition | null>> {
  if (!isUuid(id)) return { ok: true, data: null };
  try {
    const { supabaseUrl } = getPublicEnv();
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("competitions")
      .select(DETAIL_COLUMNS)
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    if (error) {
      logQueryError("getPublishedCompetition", error);
      return { ok: false, error: "We couldn't load this quest. Please try again." };
    }
    return { ok: true, data: data ? toCompetition(data, supabaseUrl, now) : null };
  } catch (error) {
    return failure(error, "We couldn't load this quest. Please try again.");
  }
}

/** Number of published competitions per category. */
export async function getPublishedCategoryCounts(): Promise<QueryResult<Partial<Record<CompetitionCategory, number>>>> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.rpc("published_category_counts");
    if (error) {
      logQueryError("getPublishedCategoryCounts", error);
      return { ok: false, error: "Category totals are unavailable." };
    }
    const counts: Partial<Record<CompetitionCategory, number>> = {};
    for (const row of data ?? []) {
      counts[row.category as CompetitionCategory] = Number(row.total);
    }
    return { ok: true, data: counts };
  } catch (error) {
    return failure(error, "Category totals are unavailable.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Administrator queries — always run with the signed-in admin's client (RLS applies).
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminFilters {
  q: string;
  category: CompetitionCategory | null;
  status: CompetitionStatus | null;
  page: number;
}

export async function listAdminCompetitions(
  supabase: ServerSupabaseClient,
  filters: AdminFilters,
  now: Date = new Date(),
): Promise<QueryResult<CompetitionPage>> {
  try {
    const { supabaseUrl } = getPublicEnv();
    const pageSize = ADMIN_PAGE_SIZE;
    const { from, to } = getPageRange(filters.page, pageSize);

    let query = supabase.from("competitions").select(SUMMARY_COLUMNS, { count: "exact" });
    query = applySearch(query, filters.q);
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.status) query = query.eq("status", filters.status);
    query = query.order("created_at", { ascending: false }).order("id", { ascending: false });

    const { data, error, count } = await query.range(from, to);
    if (error?.code === RANGE_NOT_SATISFIABLE) {
      return { ok: true, data: { items: [], total: count ?? 0, page: filters.page, pageCount: 1, pageSize } };
    }
    if (error) {
      logQueryError("listAdminCompetitions", error);
      return { ok: false, error: "Could not load competitions." };
    }
    const total = count ?? data.length;
    return {
      ok: true,
      data: {
        items: data.map((row) => toCompetition(row, supabaseUrl, now)),
        total,
        page: filters.page,
        pageCount: getPageCount(total, pageSize),
        pageSize,
      },
    };
  } catch (error) {
    return failure(error, "Could not load competitions.");
  }
}

export interface DashboardStats {
  total: number;
  published: number;
  drafts: number;
  upcomingDeadlines: number;
  nextDeadlines: Competition[];
  recentlyAdded: Competition[];
}

export async function getDashboardStats(
  supabase: ServerSupabaseClient,
  now: Date = new Date(),
): Promise<QueryResult<DashboardStats>> {
  try {
    const { supabaseUrl } = getPublicEnv();
    const nowIso = now.toISOString();
    const countOnly = { count: "exact", head: true } as const;

    const [total, published, drafts, upcoming, nextDeadlines, recent] = await Promise.all([
      supabase.from("competitions").select("id", countOnly),
      supabase.from("competitions").select("id", countOnly).eq("status", "published"),
      supabase.from("competitions").select("id", countOnly).eq("status", "draft"),
      supabase
        .from("competitions")
        .select("id", countOnly)
        .eq("status", "published")
        .gt("registration_deadline", nowIso),
      supabase
        .from("competitions")
        .select(SUMMARY_COLUMNS)
        .eq("status", "published")
        .gt("registration_deadline", nowIso)
        .order("registration_deadline", { ascending: true })
        .limit(5),
      supabase.from("competitions").select(SUMMARY_COLUMNS).order("created_at", { ascending: false }).limit(5),
    ]);

    const firstError = [total, published, drafts, upcoming, nextDeadlines, recent].find((result) => result.error)?.error;
    if (firstError) {
      logQueryError("getDashboardStats", firstError);
      return { ok: false, error: "Could not load dashboard statistics." };
    }

    return {
      ok: true,
      data: {
        total: total.count ?? 0,
        published: published.count ?? 0,
        drafts: drafts.count ?? 0,
        upcomingDeadlines: upcoming.count ?? 0,
        nextDeadlines: (nextDeadlines.data ?? []).map((row) => toCompetition(row, supabaseUrl, now)),
        recentlyAdded: (recent.data ?? []).map((row) => toCompetition(row, supabaseUrl, now)),
      },
    };
  } catch (error) {
    return failure(error, "Could not load dashboard statistics.");
  }
}

export async function getCompetitionForAdmin(
  supabase: ServerSupabaseClient,
  id: string,
  now: Date = new Date(),
): Promise<QueryResult<Competition | null>> {
  if (!isUuid(id)) return { ok: true, data: null };
  try {
    const { supabaseUrl } = getPublicEnv();
    const { data, error } = await supabase.from("competitions").select(DETAIL_COLUMNS).eq("id", id).maybeSingle();
    if (error) {
      logQueryError("getCompetitionForAdmin", error);
      return { ok: false, error: "Could not load this competition." };
    }
    return { ok: true, data: data ? toCompetition(data, supabaseUrl, now) : null };
  } catch (error) {
    return failure(error, "Could not load this competition.");
  }
}
