import { CLOSING_SOON_DAYS } from "@/lib/config";

/**
 * Registration status is always derived from `registration_deadline` at
 * request time. It is never stored, so it can never go stale.
 *
 *   closed        deadline <= now
 *   closing-soon  now < deadline <= now + CLOSING_SOON_DAYS
 *   open          deadline >  now + CLOSING_SOON_DAYS
 *   unspecified   no deadline recorded
 */
export const DEADLINE_STATUS_VALUES = ["open", "closing-soon", "closed", "unspecified"] as const;

export type DeadlineStatus = (typeof DEADLINE_STATUS_VALUES)[number];

export const DEADLINE_STATUS_LABELS: Record<DeadlineStatus, string> = {
  open: "Open",
  "closing-soon": "Closing Soon",
  closed: "Closed",
  unspecified: "No Deadline",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function isDeadlineStatus(value: unknown): value is DeadlineStatus {
  return typeof value === "string" && (DEADLINE_STATUS_VALUES as readonly string[]).includes(value);
}

export function getDeadlineStatus(
  deadlineIso: string | null | undefined,
  now: Date = new Date(),
  closingSoonDays: number = CLOSING_SOON_DAYS,
): DeadlineStatus {
  if (!deadlineIso) return "unspecified";
  const deadline = Date.parse(deadlineIso);
  if (Number.isNaN(deadline)) return "unspecified";
  const nowMs = now.getTime();
  if (deadline <= nowMs) return "closed";
  if (deadline - nowMs <= closingSoonDays * DAY_MS) return "closing-soon";
  return "open";
}

/**
 * The database filter equivalent to `getDeadlineStatus(...) === status`, expressed
 * as bounds on `registration_deadline` (ISO strings). Keeps filtering, counting and
 * pagination consistent with the labels shown on cards.
 */
export type DeadlineFilter =
  | { kind: "is-null" }
  | { kind: "range"; gt?: string; lte?: string };

export function getDeadlineFilter(
  status: DeadlineStatus,
  now: Date = new Date(),
  closingSoonDays: number = CLOSING_SOON_DAYS,
): DeadlineFilter {
  const nowIso = now.toISOString();
  const soonIso = new Date(now.getTime() + closingSoonDays * DAY_MS).toISOString();
  switch (status) {
    case "unspecified":
      return { kind: "is-null" };
    case "closed":
      return { kind: "range", lte: nowIso };
    case "closing-soon":
      return { kind: "range", gt: nowIso, lte: soonIso };
    case "open":
      return { kind: "range", gt: soonIso };
  }
}

/** Short countdown text such as "3 days left", "5 hours left", "Closed". */
export function describeTimeRemaining(deadlineIso: string | null | undefined, now: Date = new Date()): string | null {
  if (!deadlineIso) return null;
  const deadline = Date.parse(deadlineIso);
  if (Number.isNaN(deadline)) return null;
  const remaining = deadline - now.getTime();
  if (remaining <= 0) return "Registration closed";
  if (remaining < HOUR_MS) return "Less than an hour left";
  if (remaining < DAY_MS) {
    const hours = Math.floor(remaining / HOUR_MS);
    return `${hours} hour${hours === 1 ? "" : "s"} left`;
  }
  const days = Math.floor(remaining / DAY_MS);
  return `${days} day${days === 1 ? "" : "s"} left`;
}
