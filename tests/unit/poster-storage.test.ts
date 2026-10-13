import { describe, expect, it } from "vitest";
import { createPosterPath, getPosterPublicUrl, isPosterPath, posterPathMatchesType } from "@/lib/images/poster-storage";
import { parsePublicEnv } from "@/lib/env";
import { chooseTier, lowerTier, parseWorldOverride } from "@/lib/world/quality";
import { fbm2D, generateIsland, hexToRgb, mulberry32, valueNoise2D } from "@/lib/world/procedural";
import { resolvePosterMaxBytes, resolveTimeZone } from "@/lib/config";

describe("poster storage paths", () => {
  it("generates valid, unique, well-formed paths", () => {
    const a = createPosterPath("image/png");
    const b = createPosterPath("image/png");
    expect(a).toMatch(/^posters\/[0-9a-f-]{36}\.png$/);
    expect(a).not.toBe(b);
    expect(createPosterPath("image/jpeg")).toMatch(/\.jpg$/);
    expect(createPosterPath("image/webp")).toMatch(/\.webp$/);
  });

  it("validates poster paths and blocks traversal", () => {
    expect(isPosterPath(createPosterPath("image/webp"))).toBe(true);
    expect(isPosterPath("posters/../../etc/passwd")).toBe(false);
    expect(isPosterPath("posters/not-a-uuid.png")).toBe(false);
    expect(isPosterPath("other/4f1a2b3c-1d2e-4f3a-8b9c-0a1b2c3d4e5f.png")).toBe(false);
    expect(isPosterPath(123)).toBe(false);
  });

  it("matches path extension to content type", () => {
    const path = createPosterPath("image/png");
    expect(posterPathMatchesType(path, "image/png")).toBe(true);
    expect(posterPathMatchesType(path, "image/jpeg")).toBe(false);
  });

  it("builds a correct, URL-encoded public URL", () => {
    const url = getPosterPublicUrl("https://proj.supabase.co/", "posters/abc def.png");
    expect(url).toBe("https://proj.supabase.co/storage/v1/object/public/competition-posters/posters/abc%20def.png");
  });
});

describe("parsePublicEnv", () => {
  it("accepts a valid url + publishable key and strips trailing slashes", () => {
    const result = parsePublicEnv({ url: "https://proj.supabase.co/", publishableKey: "sb_pub_x", anonKey: undefined });
    expect(result.ok && result.env.supabaseUrl).toBe("https://proj.supabase.co");
  });
  it("falls back to the legacy anon key", () => {
    const result = parsePublicEnv({ url: "https://proj.supabase.co", publishableKey: undefined, anonKey: "anon_x" });
    expect(result.ok && result.env.supabaseKey).toBe("anon_x");
  });
  it("reports problems when configuration is missing or invalid", () => {
    expect(parsePublicEnv({ url: undefined, publishableKey: undefined, anonKey: undefined }).ok).toBe(false);
    const bad = parsePublicEnv({ url: "not a url", publishableKey: "k", anonKey: undefined });
    expect(bad.ok).toBe(false);
  });
});

describe("config parsers", () => {
  it("clamps the poster size and falls back to 5 MiB", () => {
    expect(resolvePosterMaxBytes("2")).toBe(2 * 1024 * 1024);
    expect(resolvePosterMaxBytes(undefined)).toBe(5 * 1024 * 1024);
    expect(resolvePosterMaxBytes("999")).toBe(5 * 1024 * 1024);
    expect(resolvePosterMaxBytes("abc")).toBe(5 * 1024 * 1024);
  });
  it("validates time zones with a UTC fallback", () => {
    expect(resolveTimeZone("Asia/Jakarta")).toBe("Asia/Jakarta");
    expect(resolveTimeZone("Mars/Phobos")).toBe("UTC");
    expect(resolveTimeZone(undefined)).toBe("UTC");
  });
});

describe("world quality selection", () => {
  it("drops to low on weak devices and save-data", () => {
    expect(chooseTier({ coarsePointer: true, viewportWidth: 360, cores: 8, memoryGb: 8, saveData: false, softwareRenderer: false })).toBe("low");
    expect(chooseTier({ coarsePointer: false, viewportWidth: 1920, cores: 8, memoryGb: 8, saveData: true, softwareRenderer: false })).toBe("low");
    expect(chooseTier({ coarsePointer: false, viewportWidth: 1920, cores: 2, memoryGb: 8, saveData: false, softwareRenderer: false })).toBe("low");
  });
  it("chooses high on strong desktops", () => {
    expect(chooseTier({ coarsePointer: false, viewportWidth: 1920, cores: 8, memoryGb: 8, saveData: false, softwareRenderer: false })).toBe("high");
  });
  it("lowerTier steps down", () => {
    expect(lowerTier("high")).toBe("medium");
    expect(lowerTier("medium")).toBe("low");
    expect(lowerTier("low")).toBe("low");
  });
  it("parses the ?world override", () => {
    expect(parseWorldOverride("?world=static")).toBe("static");
    expect(parseWorldOverride("?world=high")).toBe("high");
    expect(parseWorldOverride("?world=ultra")).toBeNull();
    expect(parseWorldOverride("")).toBeNull();
  });
});

describe("procedural generation is deterministic", () => {
  it("mulberry32 is seed-stable and in range", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 5; i += 1) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
  it("noise stays within [0,1]", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(valueNoise2D(i * 0.3, i * 0.7, 9)).toBeGreaterThanOrEqual(0);
      expect(fbm2D(i * 0.3, i * 0.7, 9)).toBeLessThanOrEqual(1);
    }
  });
  it("generates a non-empty island identically for the same seed", () => {
    const options = { radius: 6, seed: 1337, hilliness: 2, depth: 6, palette: { top: hexToRgb(0x1d7a5f), topAlt: hexToRgb(0x2fa874), soil: hexToRgb(0x3b2a5e), stone: hexToRgb(0x272052), deep: hexToRgb(0x181339), crystals: [hexToRgb(0x2de2f5)] } } as const;
    const first = generateIsland(options);
    const second = generateIsland(options);
    expect(first.blocks.length).toBeGreaterThan(0);
    expect(first.blocks.length).toBe(second.blocks.length);
    expect(first.blocks[0]).toEqual(second.blocks[0]);
  });
});
