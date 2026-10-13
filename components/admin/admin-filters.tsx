"use client";

import Form from "next/form";
import Link from "next/link";
import { useId } from "react";
import { Search } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import type { AdminFilters as AdminFilterValues } from "@/lib/competitions/queries";

/** GET form: filters live in the URL, and next/form navigates client-side without a full reload. */
export function AdminFilters({ filters }: { filters: AdminFilterValues }) {
  const searchId = useId();
  const categoryId = useId();
  const statusId = useId();
  const active = Boolean(filters.q || filters.category || filters.status);

  return (
    <Form action="/admin" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_11rem_auto] md:items-end">
      <div>
        <label htmlFor={searchId} className="field-label">
          Search
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist-dim" aria-hidden="true" />
          <input id={searchId} name="q" type="search" defaultValue={filters.q} placeholder="Title or organizer" className="field-input pl-9" maxLength={80} />
        </div>
      </div>
      <div>
        <label htmlFor={categoryId} className="field-label">
          Category
        </label>
        <select
          id={categoryId}
          name="category"
          defaultValue={filters.category ?? ""}
          className="field-input cursor-pointer"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={statusId} className="field-label">
          Status
        </label>
        <select
          id={statusId}
          name="status"
          defaultValue={filters.status ?? ""}
          className="field-input cursor-pointer"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">All</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-secondary">
          Apply
        </button>
        {active && (
          <Link href="/admin" className="btn btn-ghost">
            Clear
          </Link>
        )}
      </div>
    </Form>
  );
}
