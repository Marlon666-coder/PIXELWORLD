/**
 * Time zone helpers built on Intl (no external date library).
 *
 * Timestamps are stored in Postgres as `timestamptz` (absolute instants).
 * Administrators type wall-clock times in the configured site time zone, so
 * the form converts "YYYY-MM-DDTHH:mm" in that zone to a UTC instant, and the
 * edit form converts back.
 */

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getWallClock(utcMs: number, timeZone: string): WallClock {
  const parts = getPartsFormatter(timeZone).formatToParts(new Date(utcMs));
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value;
    return value === undefined ? NaN : Number(value);
  };
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
  };
}

/** Offset of `timeZone` from UTC at the given instant, in milliseconds (e.g. +07:00 → 25_200_000). */
export function getTimeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const wholeSecond = Math.floor(utcMs / 1000) * 1000;
  const wall = getWallClock(wholeSecond, timeZone);
  const wallAsUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return wallAsUtc - wholeSecond;
}

const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Converts a wall-clock value such as "2026-10-20T23:59" in `timeZone` to a UTC Date.
 * Returns null for malformed or impossible dates (e.g. 2026-02-30).
 * Times that fall inside a daylight-saving gap resolve to the equivalent instant after the shift.
 */
export function zonedDateTimeToUtc(value: string, timeZone: string): Date | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value.trim());
  if (!match) return null;

  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => (part ? Number(part) : 0));
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return null;
  }

  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(wallAsUtc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }

  // Two-pass offset resolution handles instants near DST transitions.
  let guess = wallAsUtc - getTimeZoneOffsetMs(wallAsUtc, timeZone);
  const correctedOffset = getTimeZoneOffsetMs(guess, timeZone);
  if (wallAsUtc - correctedOffset !== guess) {
    guess = wallAsUtc - correctedOffset;
  }
  return new Date(guess);
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Formats an instant as a `datetime-local` input value ("YYYY-MM-DDTHH:mm") in `timeZone`. */
export function utcToZonedInputValue(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const wall = getWallClock(ms, timeZone);
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}`;
}

/** Human readable UTC offset label such as "UTC+07:00" for the given zone at the given instant. */
export function formatUtcOffset(timeZone: string, at: Date = new Date()): string {
  const offsetMinutes = Math.round(getTimeZoneOffsetMs(at.getTime(), timeZone) / 60000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  return `UTC${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}
