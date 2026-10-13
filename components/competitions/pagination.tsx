import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageCount: number;
  /** Builds the href for a given page number. */
  hrefFor: (page: number) => string;
  label?: string;
}

/** Page numbers to show: first, last, and a window around the current page. */
export function getPageItems(page: number, pageCount: number): Array<number | "gap"> {
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const sorted = Array.from(pages)
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) items.push("gap");
    items.push(value);
  });
  return items;
}

export function Pagination({ page, pageCount, hrefFor, label = "Pagination" }: PaginationProps) {
  if (pageCount <= 1) return null;
  const items = getPageItems(page, pageCount);
  const linkBase = "chip min-w-10 justify-center";

  return (
    <nav aria-label={label} className="mt-12 flex flex-wrap items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkBase} rel="prev">
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span>Prev</span>
        </Link>
      ) : (
        <span className={cn(linkBase, "opacity-40")} aria-hidden="true">
          <ChevronLeft className="size-4" />
          Prev
        </span>
      )}

      <ul className="flex flex-wrap items-center gap-2">
        {items.map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 font-mono text-mist-dim">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                className={linkBase}
                aria-current={item === page ? "true" : undefined}
                aria-label={`Page ${item}`}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ul>

      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={linkBase} rel="next">
          <span>Next</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={cn(linkBase, "opacity-40")} aria-hidden="true">
          Next
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
