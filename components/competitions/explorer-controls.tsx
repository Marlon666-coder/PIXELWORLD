"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useTransition, type FormEvent } from "react";
import { LoaderCircle, RotateCcw, Search, X } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { DEADLINE_STATUS_LABELS, DEADLINE_STATUS_VALUES } from "@/lib/competitions/deadline";
import {
  buildExplorerQuery,
  DEFAULT_FILTERS,
  hasActiveFilters,
  MAX_SEARCH_LENGTH,
  sanitizeSearchTerm,
  SORT_LABELS,
  SORT_VALUES,
  type ExplorerFilters,
  type SortValue,
} from "@/lib/competitions/explorer-params";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Search, filter and sort controls. State lives in the URL (?q=&category=&status=&sort=&page=),
 * so every view is shareable and the server renders exactly the requested page.
 */
export function ExplorerControls({ filters }: { filters: ExplorerFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchId = useId();
  const sortId = useId();
  // Latest filters, read by debounced callbacks so they never merge stale state.
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
    // Sync the uncontrolled search box when the URL changes elsewhere (links, back/forward),
    // but never while the visitor is typing in it.
    const input = searchRef.current;
    if (input && document.activeElement !== input && sanitizeSearchTerm(input.value) !== filters.q) {
      input.value = filters.q;
    }
  }, [filters]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const navigate = (next: Partial<ExplorerFilters>) => {
    const merged: ExplorerFilters = { ...filtersRef.current, ...next, page: next.page ?? 1 };
    startTransition(() => {
      router.replace(`${pathname}${buildExplorerQuery(merged)}`, { scroll: false });
    });
  };

  const scheduleSearch = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const term = sanitizeSearchTerm(value);
      if (term !== filtersRef.current.q) navigate({ q: term });
    }, SEARCH_DEBOUNCE_MS);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate({ q: sanitizeSearchTerm(searchRef.current?.value ?? "") });
  };

  const clearSearch = () => {
    if (searchRef.current) searchRef.current.value = "";
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (filters.q) navigate({ q: "" });
    searchRef.current?.focus();
  };

  const resetAll = () => {
    if (searchRef.current) searchRef.current.value = "";
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate({ ...DEFAULT_FILTERS });
  };

  return (
    <div className="mt-10 min-w-0 space-y-5" data-pending={pending ? "true" : undefined}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <form role="search" onSubmit={submitSearch} className="flex-1">
          <label htmlFor={searchId} className="field-label">
            Search quests
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-mist-dim" aria-hidden="true" />
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              name="q"
              defaultValue={filters.q}
              maxLength={MAX_SEARCH_LENGTH}
              placeholder="Competition title or organizer…"
              autoComplete="off"
              enterKeyHint="search"
              className="field-input pr-11 pl-10"
              onChange={(event) => scheduleSearch(event.target.value)}
            />
            {filters.q && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center text-mist hover:text-ink"
                aria-label="Clear search"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </form>

        <div className="md:w-64">
          <label htmlFor={sortId} className="field-label">
            Sort by
          </label>
          <select
            id={sortId}
            value={filters.sort}
            onChange={(event) => navigate({ sort: event.target.value as SortValue })}
            className="field-input cursor-pointer"
          >
            {SORT_VALUES.map((value) => (
              <option key={value} value={value}>
                {SORT_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="field-label">Category</legend>
        <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin]">
          <button type="button" className="chip" aria-pressed={filters.category === null} onClick={() => navigate({ category: null })}>
            All
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              type="button"
              className="chip"
              aria-pressed={filters.category === category.value}
              onClick={() => navigate({ category: filters.category === category.value ? null : category.value })}
            >
              {category.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <fieldset>
          <legend className="field-label">Registration</legend>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button type="button" className="chip" aria-pressed={filters.status === null} onClick={() => navigate({ status: null })}>
              Any
            </button>
            {DEADLINE_STATUS_VALUES.map((status) => (
              <button
                key={status}
                type="button"
                className="chip"
                aria-pressed={filters.status === status}
                onClick={() => navigate({ status: filters.status === status ? null : status })}
              >
                {status === "unspecified" ? "Unspecified deadline" : DEADLINE_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center gap-3">
          <span aria-live="polite" className={cn("hud-label flex items-center gap-2", !pending && "invisible")}>
            <LoaderCircle className="size-3.5 animate-spin text-neon-cyan" aria-hidden="true" />
            {pending ? "Scanning…" : ""}
          </span>
          {hasActiveFilters(filters) && (
            <button type="button" onClick={resetAll} className="btn btn-ghost btn-sm">
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
