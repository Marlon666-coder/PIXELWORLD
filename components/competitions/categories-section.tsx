import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { CATEGORIES, type CompetitionCategory } from "@/lib/categories";
import { getPublishedCategoryCounts } from "@/lib/competitions/queries";
import { cn } from "@/lib/utils";
import { ACCENT_TEXT, CategoryIcon } from "./category-icon";

function CategoryGrid({ counts }: { counts: Partial<Record<CompetitionCategory, number>> | null }) {
  return (
    <ul className="mt-10 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-5">
      {CATEGORIES.map((category) => {
        const count = counts?.[category.value] ?? 0;
        return (
          <li key={category.value}>
            <Link
              href={`/?category=${category.value}#explore`}
              className="quest-card group flex h-full flex-col gap-4 p-5"
            >
              <span className={cn("pixel-border flex size-11 items-center justify-center bg-void-800", ACCENT_TEXT[category.accent])}>
                <CategoryIcon category={category.value} className="size-5" />
              </span>
              <span className="space-y-1.5">
                <span className="block font-semibold text-ink">{category.label}</span>
                <span className="block text-sm leading-snug text-mist">{category.realm}</span>
              </span>
              <span className="mt-auto flex items-center justify-between gap-2 font-mono text-[11px] tracking-[0.18em] text-mist-dim uppercase">
                {counts ? `${count} ${count === 1 ? "quest" : "quests"}` : "Browse"}
                <ArrowRight className="size-3.5 text-neon-cyan transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

async function CategoryGridWithCounts() {
  const result = await getPublishedCategoryCounts();
  // Totals are a nice-to-have; the tiles still work as filters without them.
  return <CategoryGrid counts={result.ok ? result.data : null} />;
}

export function CategoriesSection() {
  return (
    <section id="categories" aria-labelledby="categories-title" className="relative z-10 border-t border-white/6 bg-void-950">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <header className="max-w-2xl">
          <p className="hud-label text-neon-violet">Realms</p>
          <h2 id="categories-title" className="mt-3 font-display text-4xl leading-none font-bold sm:text-5xl">
            CATEGORIES
          </h2>
          <p className="mt-5 text-mist">Pick a realm to filter the quest board.</p>
        </header>
        <Suspense fallback={<CategoryGrid counts={null} />}>
          <CategoryGridWithCounts />
        </Suspense>
      </div>
    </section>
  );
}
