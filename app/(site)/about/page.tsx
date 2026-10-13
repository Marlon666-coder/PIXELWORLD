import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Orbit, ShieldCheck, Swords } from "lucide-react";
import { CategoryIcon, ACCENT_TEXT } from "@/components/competitions/category-icon";
import { PageBackdrop } from "@/components/layout/page-backdrop";
import { CATEGORIES } from "@/lib/categories";
import { CLOSING_SOON_DAYS, SITE, SITE_TIME_ZONE } from "@/lib/config";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description: "What PIXEL QUEST is, how to find competitions, and how listings are managed.",
};

const STEPS = [
  { icon: Orbit, title: "Scan the universe", body: "Every poster on the quest board is a real competition uploaded by a PIXEL QUEST administrator." },
  {
    icon: Compass,
    title: "Choose your quest",
    body: "Search by title or organizer, filter by category and registration status, and sort by newest, oldest, nearest deadline, or name.",
  },
  {
    icon: Swords,
    title: "Enter the portal",
    body: "Each quest has its own shareable page with the full poster, dates, description, and a link to the organizer's registration page.",
  },
];

export default function AboutPage() {
  return (
    <main id="main" className="relative pt-32 pb-24">
      <PageBackdrop />
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <header className="max-w-3xl">
          <p className="hud-label text-neon-cyan">Player manual</p>
          <h1 className="mt-4 font-display text-5xl leading-none font-bold sm:text-6xl">ABOUT {SITE.name}</h1>
          <p className="mt-6 text-lg leading-relaxed text-mist">
            {SITE.name} turns competition discovery into an adventure. Instead of scrolling a spreadsheet of links, you
            explore a pixel universe where every poster is a quest waiting for a challenger — from hackathons and
            programming contests to design, business, science writing and photography.
          </p>
        </header>

        <section aria-labelledby="how-title" className="mt-16">
          <h2 id="how-title" className="font-display text-3xl font-bold">
            HOW IT WORKS
          </h2>
          <ol className="mt-6 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="panel p-6">
                <step.icon className="size-6 text-neon-cyan" aria-hidden="true" />
                <p className="mt-4 font-mono text-xs tracking-[0.2em] text-mist uppercase">Step {index + 1}</p>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="status-title" className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="panel p-6">
            <h2 id="status-title" className="font-display text-2xl font-bold">
              REGISTRATION STATUS
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-mist">
              <li>
                <strong className="text-neon-green">Open</strong> — the deadline is more than {CLOSING_SOON_DAYS} days away.
              </li>
              <li>
                <strong className="text-neon-magenta">Closing soon</strong> — the deadline is within {CLOSING_SOON_DAYS} days.
              </li>
              <li>
                <strong className="text-ink">Closed</strong> — the deadline has passed.
              </li>
              <li>
                <strong className="text-ink">Unspecified</strong> — the organizer did not publish a deadline.
              </li>
            </ul>
            <p className="mt-4 text-xs text-mist-dim">
              Status is calculated live from each competition&apos;s deadline. Dates are shown in the {SITE_TIME_ZONE} time
              zone.
            </p>
          </div>
          <div className="panel p-6">
            <ShieldCheck className="size-6 text-neon-green" aria-hidden="true" />
            <h2 className="mt-3 font-display text-2xl font-bold">FOR ORGANIZERS</h2>
            <p className="mt-3 text-sm leading-relaxed text-mist">
              Listings are curated by the site administrators. Always confirm rules, fees and deadlines on the
              organizer&apos;s official page — {SITE.name} links to it but does not run the competitions. Visitors
              don&apos;t need an account, and the site doesn&apos;t ask for personal data.
            </p>
          </div>
        </section>

        <section aria-labelledby="realms-title" className="mt-16">
          <h2 id="realms-title" className="font-display text-3xl font-bold">
            REALMS
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category) => (
              <li key={category.value}>
                <Link href={`/?category=${category.value}#explore`} className="quest-card flex items-center gap-3 p-4">
                  <CategoryIcon category={category.value} className={cn("size-5 shrink-0", ACCENT_TEXT[category.accent])} />
                  <span>
                    <span className="block font-semibold">{category.label}</span>
                    <span className="block text-xs text-mist">{category.realm}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-16 flex flex-wrap gap-3">
          <Link href="/#explore" className="btn btn-primary">
            Explore competitions
          </Link>
          <Link href="/" className="btn btn-secondary">
            Back to the universe
          </Link>
        </div>
      </div>
    </main>
  );
}
