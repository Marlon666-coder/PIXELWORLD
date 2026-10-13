import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { SITE_TIME_ZONE } from "@/lib/config";
import { describeTimeRemaining } from "@/lib/competitions/deadline";
import type { Competition } from "@/lib/competitions/model";
import { formatDate } from "@/lib/time/format";
import { CategoryBadge, DeadlineBadge } from "./badges";
import { PosterFrame } from "./poster-frame";

export const CARD_IMAGE_SIZES = "(min-width: 1280px) 300px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw";

export function CompetitionCard({ competition, priority = false }: { competition: Competition; priority?: boolean }) {
  const deadline = formatDate(competition.registrationDeadline, SITE_TIME_ZONE);
  const remaining =
    competition.deadlineStatus === "open" || competition.deadlineStatus === "closing-soon"
      ? describeTimeRemaining(competition.registrationDeadline)
      : null;

  return (
    <article className="group h-full" data-testid="competition-card">
      <Link
        href={`/competitions/${competition.id}`}
        className="quest-card flex h-full flex-col"
        aria-describedby={`card-meta-${competition.id}`}
      >
        <div className="relative">
          <PosterFrame
            poster={competition.poster}
            title={competition.title}
            accent={competition.category.accent}
            sizes={CARD_IMAGE_SIZES}
            priority={priority}
          />
          <div className="absolute inset-x-2.5 top-2.5 flex flex-wrap items-start justify-between gap-2">
            <CategoryBadge category={competition.category} />
            <DeadlineBadge status={competition.deadlineStatus} />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <h3 className="line-clamp-2 font-display text-xl leading-tight font-bold text-ink">{competition.title}</h3>
          <div id={`card-meta-${competition.id}`} className="space-y-1.5 text-sm">
            <p className="line-clamp-1 text-mist">
              <span className="sr-only">Organizer: </span>
              {competition.organizer}
            </p>
            <p className="flex items-center gap-2 text-mist">
              <CalendarClock className="size-4 shrink-0 text-mist-dim" aria-hidden="true" />
              {deadline ? (
                <span>
                  <span className="sr-only">Registration deadline: </span>
                  {deadline}
                  {remaining && <span className="text-mist-dim"> · {remaining}</span>}
                </span>
              ) : (
                <span>No registration deadline listed</span>
              )}
            </p>
          </div>
          <span className="mt-auto inline-flex items-center gap-2 pt-1 font-mono text-xs font-semibold tracking-[0.2em] text-neon-cyan uppercase">
            View quest
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </article>
  );
}
