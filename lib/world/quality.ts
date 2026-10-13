export type QualityTier = "high" | "medium" | "low";

export interface WorldCapabilities {
  webgl: boolean;
  tier: QualityTier;
}

export interface QualitySettings {
  tier: QualityTier;
  dpr: [number, number];
  stars: number;
  sparkles: number;
  floatingCubes: number;
  mountainColumns: number;
  satelliteIslands: number;
  postprocessing: boolean;
  multisampling: number;
}

export const QUALITY_PRESETS: Record<QualityTier, QualitySettings> = {
  high: {
    tier: "high",
    dpr: [1, 1.75],
    stars: 4200,
    sparkles: 70,
    floatingCubes: 64,
    mountainColumns: 70,
    satelliteIslands: 4,
    postprocessing: true,
    multisampling: 4,
  },
  medium: {
    tier: "medium",
    dpr: [1, 1.5],
    stars: 2600,
    sparkles: 44,
    floatingCubes: 40,
    mountainColumns: 52,
    satelliteIslands: 3,
    postprocessing: true,
    multisampling: 0,
  },
  low: {
    tier: "low",
    dpr: [1, 1.25],
    stars: 1200,
    sparkles: 22,
    floatingCubes: 22,
    mountainColumns: 36,
    satelliteIslands: 2,
    postprocessing: false,
    multisampling: 0,
  },
};

export function lowerTier(tier: QualityTier): QualityTier {
  return tier === "high" ? "medium" : "low";
}

interface DeviceSignals {
  coarsePointer: boolean;
  viewportWidth: number;
  cores: number;
  memoryGb: number;
  saveData: boolean;
  softwareRenderer: boolean;
}

export function chooseTier(signals: DeviceSignals): QualityTier {
  if (signals.saveData || signals.softwareRenderer || signals.cores <= 2 || signals.memoryGb <= 2) return "low";
  if (signals.coarsePointer && signals.viewportWidth < 768) return "low";
  if (signals.coarsePointer || signals.viewportWidth < 1200 || signals.cores <= 4 || signals.memoryGb <= 4) return "medium";
  return "high";
}

type WebGLProbe = { supported: boolean; softwareRenderer: boolean };

function probeWebGL2(): WebGLProbe {
  try {
    const canvas = document.createElement("canvas");
    const strict = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (strict) {
      strict.getExtension("WEBGL_lose_context")?.loseContext();
      return { supported: true, softwareRenderer: false };
    }
    const relaxed = document.createElement("canvas").getContext("webgl2");
    if (relaxed) {
      relaxed.getExtension("WEBGL_lose_context")?.loseContext();
      return { supported: true, softwareRenderer: true };
    }
  } catch {
    // fall through
  }
  return { supported: false, softwareRenderer: false };
}

/**
 * QA override via `?world=high|medium|low|static` — forces a quality tier or the
 * static fallback so every rendering path can be checked on any device.
 */
export function parseWorldOverride(search: string): QualityTier | "static" | null {
  const value = new URLSearchParams(search).get("world");
  return value === "high" || value === "medium" || value === "low" || value === "static" ? value : null;
}

/** Browser-only. Three.js (r163+) requires WebGL 2. */
export function detectWorldCapabilities(): WorldCapabilities {
  const override = parseWorldOverride(window.location.search);
  if (override === "static") return { webgl: false, tier: "low" };
  const probe = probeWebGL2();
  if (override && probe.supported) return { webgl: true, tier: override };
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const tier = chooseTier({
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    viewportWidth: Math.min(window.innerWidth, window.screen?.width ?? window.innerWidth),
    cores: nav.hardwareConcurrency ?? 4,
    memoryGb: nav.deviceMemory ?? 4,
    saveData: nav.connection?.saveData === true,
    softwareRenderer: probe.softwareRenderer,
  });
  return { webgl: probe.supported, tier };
}
