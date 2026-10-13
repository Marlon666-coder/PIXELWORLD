import { describe, expect, it } from "vitest";
import { formatUtcOffset, getTimeZoneOffsetMs, utcToZonedInputValue, zonedDateTimeToUtc } from "@/lib/time/timezone";

describe("zonedDateTimeToUtc", () => {
  it("interprets wall-clock time in a fixed-offset zone", () => {
    // 23:59 in Jakarta (UTC+7) is 16:59 UTC.
    expect(zonedDateTimeToUtc("2026-10-20T23:59", "Asia/Jakarta")?.toISOString()).toBe("2026-10-20T16:59:00.000Z");
  });

  it("treats UTC input as UTC", () => {
    expect(zonedDateTimeToUtc("2026-01-01T00:00", "UTC")?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("handles negative offsets", () => {
    // 09:00 in New York (EST, UTC-5 in January) is 14:00 UTC.
    expect(zonedDateTimeToUtc("2026-01-15T09:00", "America/New_York")?.toISOString()).toBe("2026-01-15T14:00:00.000Z");
  });

  it("resolves times across a DST spring-forward boundary without crashing", () => {
    // US DST begins 2026-03-08 02:00 local; 02:30 does not exist and must still yield a valid instant.
    const result = zonedDateTimeToUtc("2026-03-08T02:30", "America/New_York");
    expect(result).toBeInstanceOf(Date);
    expect(Number.isNaN(result!.getTime())).toBe(false);
  });

  it("rejects malformed and impossible dates", () => {
    expect(zonedDateTimeToUtc("2026-02-30T10:00", "UTC")).toBeNull();
    expect(zonedDateTimeToUtc("2026-13-01T10:00", "UTC")).toBeNull();
    expect(zonedDateTimeToUtc("not a date", "UTC")).toBeNull();
    expect(zonedDateTimeToUtc("2026-10-20T25:00", "UTC")).toBeNull();
  });
});

describe("utcToZonedInputValue round-trips with zonedDateTimeToUtc", () => {
  for (const zone of ["UTC", "Asia/Jakarta", "America/New_York", "Australia/Eucla"]) {
    it(`round-trips in ${zone}`, () => {
      const original = "2026-10-20T23:59";
      const iso = zonedDateTimeToUtc(original, zone)!.toISOString();
      expect(utcToZonedInputValue(iso, zone)).toBe(original);
    });
  }

  it("returns an empty string for null/invalid input", () => {
    expect(utcToZonedInputValue(null, "UTC")).toBe("");
    expect(utcToZonedInputValue("bad", "UTC")).toBe("");
  });
});

describe("getTimeZoneOffsetMs / formatUtcOffset", () => {
  it("computes known offsets", () => {
    const instant = Date.parse("2026-06-15T00:00:00Z");
    expect(getTimeZoneOffsetMs(instant, "UTC")).toBe(0);
    expect(getTimeZoneOffsetMs(instant, "Asia/Jakarta")).toBe(7 * 3_600_000);
  });

  it("formats offsets with a sign and padding", () => {
    expect(formatUtcOffset("UTC", new Date("2026-06-15T00:00:00Z"))).toBe("UTC+00:00");
    expect(formatUtcOffset("Asia/Jakarta", new Date("2026-06-15T00:00:00Z"))).toBe("UTC+07:00");
    expect(formatUtcOffset("America/New_York", new Date("2026-01-15T00:00:00Z"))).toBe("UTC-05:00");
  });
});
