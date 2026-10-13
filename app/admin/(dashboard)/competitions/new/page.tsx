import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CompetitionForm } from "@/components/admin/competition-form";
import { requireAdminPage } from "@/lib/auth/admin";
import { POSTER_MAX_BYTES, SITE_TIME_ZONE } from "@/lib/config";
import { formatUtcOffset } from "@/lib/time/timezone";

export const metadata: Metadata = { title: "New competition" };

export default async function NewCompetitionPage() {
  await requireAdminPage("/admin/competitions/new");

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/admin" className="btn btn-ghost btn-sm -ml-3">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Dashboard
        </Link>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">NEW COMPETITION</h1>
        <p className="mt-2 text-mist">Fields marked * are required. Drafts can be saved without a poster.</p>
      </div>
      <CompetitionForm
        mode="create"
        initialValues={{
          title: "",
          organizer: "",
          description: "",
          registrationDeadline: "",
          eventDate: "",
          registrationUrl: "",
          status: "draft",
        }}
        existingPosterUrl={null}
        timeZoneLabel={`${SITE_TIME_ZONE} (${formatUtcOffset(SITE_TIME_ZONE)})`}
        maxPosterBytes={POSTER_MAX_BYTES}
      />
    </div>
  );
}
