import { isCategory, type CompetitionCategory } from "@/lib/categories";
import { isDeadlineStatus, type DeadlineStatus } from "./deadline";

export const SORT_VALUES = ["newest", "oldest", "deadline", "title"] as const;
export type SortValue = (typeof SORT_VALUES)[number];

export const SORT_LABELS: Record<SortValue, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  deadline: "Nearest deadline",
  title: "Alphabetical (A–Z)",
};

export interface ExplorerFilters {
  q: string;
  category: CompetitionCategory | null;
  status: DeadlineStatus | null;
  sort: SortValue;
  page: number;
}

export const DEFAULT_FILTERS: ExplorerFilters = {
  q: "",
  category: null,
  status: null,
  sort: "newest",
  page: 1,
};

export const MAX_SEARCH_LENGTH = 80;
const MAX_PAGE = 10_000;

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Removes characters that carry meaning in PostgREST filter syntax or LIKE
 * patterns (, ( ) " \ % _ *) so user input can never alter the query shape.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[,()"\\%_*:]/g, " ")
    // Strip control characters.
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);
}

export function parseExplorerParams(params: SearchParamsRecord): ExplorerFilters {
  const q = sanitizeSearchTerm(first(params.q) ?? "");
  const categoryParam = first(params.category);
  const statusParam = first(params.status);
  const sortParam = first(params.sort);
  const pageParam = Number.parseInt(first(params.page) ?? "1", 10);

  return {
    q,
    category: isCategory(categoryParam) ? categoryParam : null,
    status: isDeadlineStatus(statusParam) ? statusParam : null,
    sort: (SORT_VALUES as readonly string[]).includes(sortParam ?? "") ? (sortParam as SortValue) : "newest",
    page: Number.isFinite(pageParam) && pageParam >= 1 ? Math.min(pageParam, MAX_PAGE) : 1,
  };
}

/** Builds a query string, omitting default values so URLs stay short and shareable. */
export function buildExplorerQuery(filters: Partial<ExplorerFilters>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function hasActiveFilters(filters: ExplorerFilters): boolean {
  return Boolean(filters.q || filters.category || filters.status || filters.sort !== "newest");
}

export interface PageWindow {
  page: number;
  pageCount: number;
  from: number;
  to: number;
}

/** Zero-based inclusive row range for a 1-based page. */
export function getPageRange(page: number, pageSize: number): { from: number; to: number } {
  const from = (Math.max(1, page) - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export function getPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
