import { z } from "zod";
import { CATEGORY_VALUES } from "@/lib/categories";
import { isPosterPath } from "@/lib/images/poster-storage";
import { isSafeExternalUrl, normalizeExternalUrl } from "@/lib/security/urls";
import { zonedDateTimeToUtc } from "@/lib/time/timezone";

export const COMPETITION_STATUS_VALUES = ["draft", "published"] as const;
export type CompetitionStatus = (typeof COMPETITION_STATUS_VALUES)[number];

export const COMPETITION_LIMITS = {
  titleMin: 3,
  titleMax: 160,
  organizerMin: 2,
  organizerMax: 120,
  descriptionMax: 5000,
  urlMax: 2048,
} as const;

const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const optionalLocalDateTime = z
  .string()
  .trim()
  .refine((value) => value === "" || LOCAL_DATE_TIME.test(value), {
    error: "Use the picker to choose a valid date and time.",
  });

/**
 * The competition form, as typed by an administrator. All values are strings
 * so the same schema validates the browser form and the Server Action input.
 */
export const competitionFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(COMPETITION_LIMITS.titleMin, { error: `Title must be at least ${COMPETITION_LIMITS.titleMin} characters.` })
    .max(COMPETITION_LIMITS.titleMax, { error: `Title must be ${COMPETITION_LIMITS.titleMax} characters or fewer.` }),
  organizer: z
    .string()
    .trim()
    .min(COMPETITION_LIMITS.organizerMin, {
      error: `Organizer must be at least ${COMPETITION_LIMITS.organizerMin} characters.`,
    })
    .max(COMPETITION_LIMITS.organizerMax, {
      error: `Organizer must be ${COMPETITION_LIMITS.organizerMax} characters or fewer.`,
    }),
  category: z.enum(CATEGORY_VALUES, { error: "Choose a category." }),
  description: z
    .string()
    .trim()
    .max(COMPETITION_LIMITS.descriptionMax, {
      error: `Description must be ${COMPETITION_LIMITS.descriptionMax} characters or fewer.`,
    }),
  registrationDeadline: optionalLocalDateTime,
  eventDate: optionalLocalDateTime,
  registrationUrl: z
    .string()
    .trim()
    .max(COMPETITION_LIMITS.urlMax, { error: "The link is too long." })
    .refine((value) => value === "" || isSafeExternalUrl(value), {
      error: "Enter a full public web link starting with https:// (or http://).",
    }),
  status: z.enum(COMPETITION_STATUS_VALUES, { error: "Choose draft or published." }),
});

export type CompetitionFormValues = z.infer<typeof competitionFormSchema>;

/** What the browser sends to the create/update Server Actions. */
export const competitionPayloadSchema = competitionFormSchema.extend({
  /** Path of a poster uploaded for this submission, or null to keep the current poster. */
  posterPath: z
    .string()
    .refine(isPosterPath, { error: "Invalid poster reference. Please upload the poster again." })
    .nullable(),
});

export type CompetitionPayload = z.infer<typeof competitionPayloadSchema>;

export const EMPTY_COMPETITION_FORM: CompetitionFormValues = {
  title: "",
  organizer: "",
  category: "other",
  description: "",
  registrationDeadline: "",
  eventDate: "",
  registrationUrl: "",
  status: "draft",
};

export interface CompetitionWrite {
  title: string;
  organizer: string;
  category: (typeof CATEGORY_VALUES)[number];
  description: string | null;
  registration_deadline: string | null;
  event_date: string | null;
  registration_url: string | null;
  status: CompetitionStatus;
}

export type FieldErrors = Partial<Record<keyof CompetitionPayload | "poster", string[]>>;

export type CompetitionWriteResult = { ok: true; data: CompetitionWrite } | { ok: false; fieldErrors: FieldErrors };

/** Converts validated form values to database columns, interpreting dates in `timeZone`. */
export function toCompetitionWrite(values: CompetitionFormValues, timeZone: string): CompetitionWriteResult {
  const fieldErrors: FieldErrors = {};

  const toIso = (value: string, field: "registrationDeadline" | "eventDate"): string | null => {
    if (value === "") return null;
    const date = zonedDateTimeToUtc(value, timeZone);
    if (!date) {
      fieldErrors[field] = ["That date does not exist. Please pick another one."];
      return null;
    }
    return date.toISOString();
  };

  const registrationDeadline = toIso(values.registrationDeadline, "registrationDeadline");
  const eventDate = toIso(values.eventDate, "eventDate");
  const registrationUrl = values.registrationUrl === "" ? null : normalizeExternalUrl(values.registrationUrl);
  if (values.registrationUrl !== "" && !registrationUrl) {
    fieldErrors.registrationUrl = ["Enter a full public web link starting with https:// (or http://)."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: {
      title: values.title,
      organizer: values.organizer,
      category: values.category,
      description: values.description === "" ? null : values.description,
      registration_deadline: registrationDeadline,
      event_date: eventDate,
      registration_url: registrationUrl,
      status: values.status,
    },
  };
}

export const posterUploadRequestSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"], {
    error: "Only JPEG, PNG and WebP posters are supported.",
  }),
  size: z.number().int().positive(),
});

export type PosterUploadRequest = z.infer<typeof posterUploadRequestSchema>;
