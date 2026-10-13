import { describe, expect, it } from "vitest";
import {
  buildExplorerQuery,
  getPageCount,
  getPageRange,
  parseExplorerParams,
  sanitizeSearchTerm,
} from "@/lib/competitions/explorer-params";
import { getPageItems } from "@/components/competitions/pagination";

describe("sanitizeSearchTerm", () => {
  it("strips PostgREST/LIKE control characters", () => {
    expect(sanitizeSearchTerm("a,b(c)%_*\"\\:d")).toBe("a b c d");
  });
  it("collapses whitespace and trims", () => {
    expect(sanitizeSearchTerm("  hello   world  ")).toBe("hello world");
  });
  it("truncates to the maximum length", () => {
    expect(sanitizeSearchTerm("x".repeat(200)).length).toBe(80);
  });
});

describe("parseExplorerParams", () => {
  it("applies safe defaults", () => {
    expect(parseExplorerParams({})).toEqual({ q: "", category: null, status: null, sort: "newest", page: 1 });
  });
  it("accepts valid values and ignores invalid ones", () => {
    expect(parseExplorerParams({ category: "programming", status: "open", sort: "deadline", page: "3" })).toEqual({
      q: "",
      category: "programming",
      status: "open",
      sort: "deadline",
      page: 3,
    });
    expect(parseExplorerParams({ category: "bogus", status: "nope", sort: "random", page: "-5" })).toMatchObject({
      category: null,
      status: null,
      sort: "newest",
      page: 1,
    });
  });
  it("takes the first value from repeated params", () => {
    expect(parseExplorerParams({ category: ["hackathon", "business"] }).category).toBe("hackathon");
  });
});

describe("buildExplorerQuery", () => {
  it("omits defaults and keeps a stable order", () => {
    expect(buildExplorerQuery({ q: "", sort: "newest", page: 1 })).toBe("");
    expect(buildExplorerQuery({ q: "ai", category: "data-science", status: "open", sort: "title", page: 2 })).toBe(
      "?q=ai&category=data-science&status=open&sort=title&page=2",
    );
  });
  it("round-trips through parseExplorerParams", () => {
    const filters = { q: "robotics", category: "programming" as const, status: "closing-soon" as const, sort: "oldest" as const, page: 4 };
    expect(parseExplorerParams(Object.fromEntries(new URLSearchParams(buildExplorerQuery(filters))))).toEqual(filters);
  });
});

describe("pagination maths", () => {
  it("computes zero-based inclusive ranges", () => {
    expect(getPageRange(1, 12)).toEqual({ from: 0, to: 11 });
    expect(getPageRange(3, 12)).toEqual({ from: 24, to: 35 });
  });
  it("computes page counts (min 1)", () => {
    expect(getPageCount(0, 12)).toBe(1);
    expect(getPageCount(13, 12)).toBe(2);
    expect(getPageCount(24, 12)).toBe(2);
  });
  it("builds a windowed page list with gaps", () => {
    expect(getPageItems(5, 10)).toEqual([1, "gap", 4, 5, 6, "gap", 10]);
    expect(getPageItems(1, 3)).toEqual([1, 2, 3]);
    expect(getPageItems(2, 2)).toEqual([1, 2]);
  });
});
