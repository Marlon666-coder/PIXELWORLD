/**
 * Application-wide constants. Everything here is safe to ship to the browser.
 *
 * Optional overrides come from NEXT_PUBLIC_* variables. They are referenced
 * literally so Next.js can inline them into client bundles at build time.
 */

export const SITE = {
  name: "PIXEL QUEST",
  headline: ["CHOOSE UR", "COMPETITION"] as const,
  tagline: "Discover your next challenge. Enter your next level.",
  description:
    "PIXEL QUEST is an immersive 3D pixel universe for discovering academic, creative, and tech competitions.",
} as const;

/** Supabase Storage bucket that holds competition posters. */
export const POSTER_BUCKET = "competition-posters";

/** Number of competitions per page in the public explorer. */
export const GALLERY_PAGE_SIZE = 12;

/** Number of competitions per page in the admin dashboard. */
export const ADMIN_PAGE_SIZE = 20;

/** A competition is "closing soon" when its deadline is within this many days. */
export const CLOSING_SOON_DAYS = 7;

/** Uploads younger than this are never treated as orphaned (they may still be in flight). */
export const ORPHAN_GRACE_PERIOD_MS = 60 * 60 * 1000;

const DEFAULT_POSTER_MAX_MB = 5;

export function resolvePosterMaxBytes(raw: string | undefined): number {
  const parsed = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  const megabytes =
    Number.isFinite(parsed) && parsed >= 0.1 && parsed <= 50 ? parsed : DEFAULT_POSTER_MAX_MB;
  return Math.round(megabytes * 1024 * 1024);
}

/**
 * Maximum poster upload size in bytes (default 5 MiB). Keep this in sync with
 * the `file_size_limit` of the `competition-posters` bucket.
 */
export const POSTER_MAX_BYTES = resolvePosterMaxBytes(process.env.NEXT_PUBLIC_POSTER_MAX_MB);

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(raw: string | undefined): string {
  const candidate = raw?.trim();
  return candidate && isValidTimeZone(candidate) ? candidate : "UTC";
}

/**
 * IANA time zone used to display dates and to interpret the wall-clock times
 * administrators type into the competition form (default UTC).
 */
export const SITE_TIME_ZONE = resolveTimeZone(process.env.NEXT_PUBLIC_SITE_TIMEZONE);
