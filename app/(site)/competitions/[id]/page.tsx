import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, Building2, CalendarClock, CalendarDays, Clock } from "lucide-react";
import { CategoryBadge, DeadlineBadge } from "@/components/competitions/badges";
import { SetupNotice, GalleryError } from "@/components/competitions/gallery-states";
import { PosterViewer } from "@/components/competitions/poster-viewer";
import { RegisterPanel } from "@/components/competitions/register-panel";
import { ShareButton } from "@/components/competitions/share-button";
import { PageBackdrop } from "@/components/layout/page-backdrop";
import { SITE_TIME_ZONE } from "@/lib/config";
import { describeTimeRemaining } from "@/lib/competitions/deadline";
import { getPublishedCompetition } from "@/lib/competitions/queries";
import { readPublicEnv } from "@/lib/env";
import { formatDate, formatDateTime } from "@/lib/time/format";

// One database round-trip per request, shared by generateMetadata and the page.
const loadCompetition = cache((id: string) => getPublishedCompetition(id));

export async function generateMetadata(props: PageProps<"/competitions/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const result = await loadCompetition(id);
  if (!result.ok || !result.data) {
    return { title: "Quest not found", robots: { index: false } };
  }
  const competition = result.data;
  const description = `${competition.category.label} competition by ${competition.organizer}.`;
  return {
    title: competition.title,
    description,
    alternates: { canonical: `/competitions/${competition.id}` },
    openGraph: {
      title: competition.title,
      description,
      type: "article",
      images: competition.poster
        ? [
            {
              url: competition.poster.url,
              width: competition.poster.width ?? undefined,
              height: competition.poster.height ?? undefined,
              alt: `Poster for ${competition.title}`,
            },
          ]
        : undefined,
    },
    twitter: { card: competition.poster ? "summary_large_image" : "summary", title: competition.title, description },
  };
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
    </>
  );
}

export default async function CompetitionPage(props: PageProps<"/competitions/[id]">) {
  const { id } = await props.params;
  const result = await loadCompetition(id);

  if (!result.ok) {
    const env = readPublicEnv();
    return (
      <main id="main" className="relative min-h-[70vh] px-5 pt-32 pb-24 sm:px-8">
        <PageBackdrop />
        <div className="mx-auto max-w-3xl">
          {result.setupRequired ? <SetupNotice problems={env.ok ? [] : env.problems} /> : <GalleryError message={result.error} />}
        </div>
      </main>
    );
  }

  const competition = result.data;
  if (!competition) notFound();

  const deadline = formatDateTime(competition.registrationDeadline, SITE_TIME_ZONE);
  const eventDate = formatDateTime(competition.eventDate, SITE_TIME_ZONE);
  const published = formatDate(competition.createdAt, SITE_TIME_ZONE);
  const remaining = describeTimeRemaining(competition.registrationDeadline);

  return (
    <main id="main" className="relative pt-28 pb-24 sm:pt-32">
      <PageBackdrop />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Link href="/#explore" className="btn btn-ghost btn-sm -ml-3">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to explorer
        </Link>

        <article className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14" data-testid="competition-detail">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <PosterViewer poster={competition.poster} title={competition.title} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={competition.category} className="pixel-border" />
              <DeadlineBadge status={competition.deadlineStatus} className="pixel-border" />
            </div>

            <h1 className="mt-5 font-display text-4xl leading-[0.95] font-bold break-words text-ink sm:text-5xl xl:text-6xl">
              {competition.title}
            </h1>
            <p className="mt-4 flex items-center gap-2 text-lg text-mist">
              <Building2 className="size-5 shrink-0 text-mist-dim" aria-hidden="true" />
              <span>
                <span className="sr-only">Organizer: </span>
                {competition.organizer}
              </span>
            </p>

            <dl className="panel mt-8 grid gap-px overflow-hidden sm:grid-cols-2">
              <div className="bg-void-900/60 p-5">
                <dt className="hud-label flex items-center gap-2">
                  <CalendarClock className="size-3.5" aria-hidden="true" />
                  Registration deadline
                </dt>
                <dd className="mt-2 font-semibold text-ink">{deadline ?? "Not specified"}</dd>
                {remaining && competition.deadlineStatus !== "closed" && (
                  <dd className="mt-1 text-sm text-neon-cyan">{remaining}</dd>
                )}
              </div>
              <div className="bg-void-900/60 p-5">
                <dt className="hud-label flex items-center gap-2">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  Event date
                </dt>
                <dd className="mt-2 font-semibold text-ink">{eventDate ?? "To be announced"}</dd>
              </div>
              <div className="bg-void-900/60 p-5 sm:col-span-2">
                <dt className="hud-label flex items-center gap-2">
                  <Clock className="size-3.5" aria-hidden="true" />
                  Listed on PIXEL QUEST
                </dt>
                <dd className="mt-2 text-mist">{published}</dd>
              </div>
            </dl>

            <div className="mt-8">
              <RegisterPanel url={competition.registrationUrl} deadlineStatus={competition.deadlineStatus} />
            </div>
            <div className="mt-3 flex justify-center sm:justify-start">
              <ShareButton title={competition.title} />
            </div>

            <section aria-labelledby="brief-title" className="mt-10">
              <h2 id="brief-title" className="hud-label text-neon-violet">
                Quest brief
              </h2>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-ink/90">
                {competition.description ? (
                  <Paragraphs text={competition.description} />
                ) : (
                  <p className="text-mist">No description has been added. The poster contains the full details.</p>
                )}
              </div>
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
