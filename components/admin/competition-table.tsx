import Image from "next/image";
import Link from "next/link";
import { Eye, ImageOff, Pencil } from "lucide-react";
import { DeadlineBadge, PublicationBadge } from "@/components/competitions/badges";
import { SITE_TIME_ZONE } from "@/lib/config";
import type { Competition } from "@/lib/competitions/model";
import { formatDate } from "@/lib/time/format";
import { DeleteCompetitionButton } from "./delete-competition-button";

function Thumb({ competition }: { competition: Competition }) {
  return (
    <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-void-950">
      {competition.poster ? (
        <Image src={competition.poster.url} alt="" fill sizes="48px" className="object-contain" />
      ) : (
        <ImageOff className="absolute inset-0 m-auto size-4 text-mist-dim" aria-hidden="true" />
      )}
    </div>
  );
}

function Actions({ competition }: { competition: Competition }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {competition.status === "published" && (
        <Link href={`/competitions/${competition.id}`} className="btn btn-ghost btn-sm" aria-label={`View ${competition.title} on the public site`}>
          <Eye className="size-4" aria-hidden="true" />
        </Link>
      )}
      <Link href={`/admin/competitions/${competition.id}/edit`} className="btn btn-ghost btn-sm" aria-label={`Edit ${competition.title}`}>
        <Pencil className="size-4" aria-hidden="true" />
        <span className="hidden xl:inline">Edit</span>
      </Link>
      <DeleteCompetitionButton id={competition.id} title={competition.title} compact />
    </div>
  );
}

export function CompetitionTable({ competitions }: { competitions: Competition[] }) {
  return (
    <>
      {/* Desktop table */}
      <div className="panel hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Competitions</caption>
          <thead className="border-b border-white/8">
            <tr className="hud-label">
              <th scope="col" className="px-4 py-3 font-normal">
                Quest
              </th>
              <th scope="col" className="px-4 py-3 font-normal">
                Category
              </th>
              <th scope="col" className="px-4 py-3 font-normal">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-normal">
                Deadline
              </th>
              <th scope="col" className="px-4 py-3 font-normal">
                Created
              </th>
              <th scope="col" className="px-4 py-3 text-right font-normal">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {competitions.map((competition) => (
              <tr key={competition.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]" data-testid="admin-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Thumb competition={competition} />
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold text-ink">{competition.title}</p>
                      <p className="truncate text-xs text-mist">{competition.organizer}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-mist">{competition.category.label}</td>
                <td className="px-4 py-3">
                  <PublicationBadge status={competition.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <DeadlineBadge status={competition.deadlineStatus} className="bg-transparent px-0" />
                    <p className="text-xs text-mist-dim">{formatDate(competition.registrationDeadline, SITE_TIME_ZONE) ?? "—"}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap text-mist">{formatDate(competition.createdAt, SITE_TIME_ZONE)}</td>
                <td className="px-4 py-3">
                  <Actions competition={competition} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {competitions.map((competition) => (
          <li key={competition.id} className="panel flex gap-3 p-3" data-testid="admin-card">
            <Thumb competition={competition} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="line-clamp-2 font-semibold">{competition.title}</p>
              <p className="truncate text-xs text-mist">
                {competition.organizer} · {competition.category.label}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <PublicationBadge status={competition.status} />
                <DeadlineBadge status={competition.deadlineStatus} className="bg-transparent px-0" />
              </div>
              <Actions competition={competition} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
