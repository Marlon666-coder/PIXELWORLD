import { describe, expect, it } from "vitest";
import {
  DEADLINE_STATUS_VALUES,
  describeTimeRemaining,
  getDeadlineFilter,
  getDeadlineStatus,
  isDeadlineStatus,
} from "@/lib/competitions/deadline";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const inDays = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();

describe("getDeadlineStatus", () => {
  it("returns 'unspecified' for null/empty/invalid deadlines", () => {
    expect(getDeadlineStatus(null, NOW)).toBe("unspecified");
    expect(getDeadlineStatus(undefined, NOW)).toBe("unspecified");
    expect(getDeadlineStatus("", NOW)).toBe("unspecified");
    expect(getDeadlineStatus("not-a-date", NOW)).toBe("unspecified");
  });

  it("returns 'closed' when the deadline is now or in the past", () => {
    expect(getDeadlineStatus(NOW.toISOString(), NOW)).toBe("closed");
    expect(getDeadlineStatus(inDays(-1), NOW)).toBe("closed");
  });

  it("returns 'closing-soon' within the default 7-day window", () => {
    expect(getDeadlineStatus(inDays(1), NOW)).toBe("closing-soon");
    expect(getDeadlineStatus(inDays(7), NOW)).toBe("closing-soon");
  });

  it("returns 'open' beyond the window", () => {
    expect(getDeadlineStatus(inDays(7.5), NOW)).toBe("open");
    expect(getDeadlineStatus(inDays(60), NOW)).toBe("open");
  });

  it("respects a custom closing-soon window", () => {
    expect(getDeadlineStatus(inDays(10), NOW, 14)).toBe("closing-soon");
    expect(getDeadlineStatus(inDays(20), NOW, 14)).toBe("open");
  });
});

describe("getDeadlineFilter matches getDeadlineStatus", () => {
  // The DB-side bounds must select exactly the rows the label logic classifies.
  const samples = [null, inDays(-30), inDays(-0.01), inDays(0.5), inDays(7), inDays(7.1), inDays(400)];

  for (const status of DEADLINE_STATUS_VALUES) {
    it(`filter for '${status}' agrees with the label for every sample`, () => {
      const filter = getDeadlineFilter(status, NOW);
      for (const deadline of samples) {
        const matchesFilter =
          filter.kind === "is-null"
            ? deadline === null
            : deadline !== null &&
              (filter.gt === undefined || deadline > filter.gt) &&
              (filter.lte === undefined || deadline <= filter.lte);
        expect(matchesFilter).toBe(getDeadlineStatus(deadline, NOW) === status);
      }
    });
  }
});

describe("describeTimeRemaining", () => {
  it("describes closed and upcoming deadlines", () => {
    expect(describeTimeRemaining(null, NOW)).toBeNull();
    expect(describeTimeRemaining(inDays(-1), NOW)).toBe("Registration closed");
    expect(describeTimeRemaining(inDays(3), NOW)).toBe("3 days left");
    expect(describeTimeRemaining(inDays(1), NOW)).toBe("1 day left");
    expect(describeTimeRemaining(new Date(NOW.getTime() + 5 * 3_600_000).toISOString(), NOW)).toBe("5 hours left");
    expect(describeTimeRemaining(new Date(NOW.getTime() + 30 * 60_000).toISOString(), NOW)).toBe("Less than an hour left");
  });
});

describe("isDeadlineStatus", () => {
  it("recognises valid status strings only", () => {
    expect(isDeadlineStatus("open")).toBe(true);
    expect(isDeadlineStatus("closing-soon")).toBe(true);
    expect(isDeadlineStatus("expired")).toBe(false);
    expect(isDeadlineStatus(42)).toBe(false);
  });
});
