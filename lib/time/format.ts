import { formatUtcOffset } from "./timezone";

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(key: string, timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const cacheKey = `${key}|${timeZone}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", { timeZone, ...options });
    formatterCache.set(cacheKey, formatter);
  }
  return formatter;
}

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : new Date(ms);
}

/** "20 Oct 2026, 23:59 (UTC+07:00)" — always labelled so readers know which zone is shown. */
export function formatDateTime(iso: string | null | undefined, timeZone: string): string | null {
  const date = toDate(iso);
  if (!date) return null;
  const text = getFormatter("datetime", timeZone, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return `${text} (${formatUtcOffset(timeZone, date)})`;
}

/** "20 Oct 2026" in the given zone. */
export function formatDate(iso: string | null | undefined, timeZone: string): string | null {
  const date = toDate(iso);
  if (!date) return null;
  return getFormatter("date", timeZone, { day: "numeric", month: "short", year: "numeric" }).format(date);
}
