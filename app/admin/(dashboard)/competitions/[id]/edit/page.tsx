import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { CompetitionForm } from "@/components/admin/competition-form";
import { DeleteCompetitionButton } from "@/components/admin/delete-competition-button";
import { PublicationBadge } from "@/components/competitions/badges";
import { GalleryError } from "@/components/competitions/gallery-states";
import { requireAdminPage } from "@/lib/auth/admin";
import { isCategory } from "@/lib/categories";
import { POSTER_MAX_BYTES, SITE_TIME_ZONE } from "@/lib/config";
import { getCompetitionForAdmin } from "@/lib/competitions/queries";
import { formatUtcOffset, utcToZonedInputValue } from "@/lib/time/timezone";

export const metadata: Metadata = { title: "Edit competition" };

export default async function EditCompetitionPage(props: PageProps<"/admin/competitions/[id]/edit">) {
  const { id } = await props.params;
  const { supabase } = await requireAdminPage(`/admin/competitions/${id}/edit`);
  const result = await getCompetitionForAdmin(supabase, id);

  if (!result.ok) return <GalleryError message={result.error} />;
  const competition = result.data;
  if (!competition) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/admin" className="btn btn-ghost btn-sm -ml-3">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Dashboard
        </Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <PublicationBadge status={competition.status} />
            <h1 className="mt-2 font-display text-4xl font-bold break-words sm:text-5xl">EDIT QUEST</h1>
            <p className="mt-1 truncate text-mist">{competition.title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {competition.status === "published" && (
              <Link href={`/competitions/${competition.id}`} className="btn btn-secondary btn-sm">
                <Eye className="size-4" aria-hidden="true" />
                View public page
              </Link>
            )}
            <DeleteCompetitionButton id={competition.id} title={competition.title} />
          </div>
        </div>
      </div>
      <CompetitionForm
        mode="edit"
        competitionId={competition.id}
        initialValues={{
          title: competition.title,
          organizer: competition.organizer,
          category: isCategory(competition.category.value) ? competition.category.value : "other",
          description: competition.description ?? "",
          registrationDeadline: utcToZonedInputValue(competition.registrationDeadline, SITE_TIME_ZONE),
          eventDate: utcToZonedInputValue(competition.eventDate, SITE_TIME_ZONE),
          registrationUrl: competition.registrationUrl ?? "",
          status: competition.status,
        }}
        existingPosterUrl={competition.poster?.url ?? null}
        timeZoneLabel={`${SITE_TIME_ZONE} (${formatUtcOffset(SITE_TIME_ZONE)})`}
        maxPosterBytes={POSTER_MAX_BYTES}
      />
    </div>
  );
}
