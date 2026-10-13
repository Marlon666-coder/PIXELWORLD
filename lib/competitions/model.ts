import { getCategory, type CategoryDefinition } from "@/lib/categories";
import { getPosterPublicUrl } from "@/lib/images/poster-storage";
import { normalizeExternalUrl } from "@/lib/security/urls";
import type { Database } from "@/lib/supabase/database.types";
import type { CompetitionStatus } from "@/lib/validation/competition";
import { getDeadlineStatus, type DeadlineStatus } from "./deadline";

export type CompetitionRow = Database["public"]["Tables"]["competitions"]["Row"];

export interface Poster {
  path: string;
  url: string;
  width: number | null;
  height: number | null;
}

export interface Competition {
  id: string;
  title: string;
  organizer: string;
  category: CategoryDefinition;
  description: string | null;
  poster: Poster | null;
  /** Only ever a validated http(s) URL; anything else becomes null. */
  registrationUrl: string | null;
  registrationDeadline: string | null;
  eventDate: string | null;
  status: CompetitionStatus;
  deadlineStatus: DeadlineStatus;
  createdAt: string;
  updatedAt: string;
}

export type CompetitionSummaryRow = Pick<
  CompetitionRow,
  | "id"
  | "title"
  | "organizer"
  | "category"
  | "poster_path"
  | "poster_width"
  | "poster_height"
  | "registration_deadline"
  | "event_date"
  | "status"
  | "created_at"
  | "updated_at"
> &
  Partial<Pick<CompetitionRow, "description" | "registration_url">>;

export function toCompetition(row: CompetitionSummaryRow, supabaseUrl: string, now: Date = new Date()): Competition {
  return {
    id: row.id,
    title: row.title,
    organizer: row.organizer,
    category: getCategory(row.category),
    description: row.description ?? null,
    poster: row.poster_path
      ? {
          path: row.poster_path,
          url: getPosterPublicUrl(supabaseUrl, row.poster_path),
          width: row.poster_width,
          height: row.poster_height,
        }
      : null,
    registrationUrl: normalizeExternalUrl(row.registration_url ?? null),
    registrationDeadline: row.registration_deadline,
    eventDate: row.event_date,
    status: row.status === "published" ? "published" : "draft",
    deadlineStatus: getDeadlineStatus(row.registration_deadline, now),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
