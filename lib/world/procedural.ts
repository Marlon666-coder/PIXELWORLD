/**
 * Deterministic procedural generation for the voxel world.
 * Everything is seeded so the world looks identical on every visit and in tests.
 */

export type RGB = readonly [number, number, number];

/** Small, fast seeded PRNG (mulberry32). Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth 2D value noise in [0, 1). */
export function valueNoise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal (multi-octave) value noise in [0, 1). */
export function fbm2D(x: number, y: number, seed: number, octaves = 3): number {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    sum += amplitude * valueNoise2D(x * frequency, y * frequency, seed + octave * 101);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / norm;
}

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: RGB;
}

export interface IslandPalette {
  top: RGB;
  topAlt: RGB;
  soil: RGB;
  stone: RGB;
  deep: RGB;
  crystals: readonly RGB[];
}

export interface IslandOptions {
  /** Radius in voxels. */
  radius: number;
  seed: number;
  /** Maximum terrain height above the base layer, in voxels. */
  hilliness: number;
  /** Depth of the underside at the centre, in voxels. */
  depth: number;
  /** Radius of a flat area at the centre (for the portal). */
  plateauRadius?: number;
  /** Probability that an exposed underside voxel becomes a glowing crystal. */
  crystalChance?: number;
  palette: IslandPalette;
}

export interface Island {
  blocks: Voxel[];
  crystals: Voxel[];
  /** Height (in voxels) of the surface at the centre. */
  centerHeight: number;
}

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

function shade(color: RGB, amount: number): RGB {
  return [
    Math.min(1, Math.max(0, color[0] * (1 + amount))),
    Math.min(1, Math.max(0, color[1] * (1 + amount))),
    Math.min(1, Math.max(0, color[2] * (1 + amount))),
  ];
}

/**
 * Generates a floating island: a noisy stepped top surface and an inverted,
 * tapering underside. Voxels hidden on all six sides are culled.
 */
export function generateIsland(options: IslandOptions): Island {
  const { radius, seed, hilliness, depth, plateauRadius = 0, crystalChance = 0, palette } = options;
  const random = mulberry32(seed);
  const occupied = new Set<string>();
  const candidates: Array<{ x: number; y: number; z: number; layer: number; rim: number; depthRatio: number }> = [];

  for (let x = -radius; x <= radius; x += 1) {
    for (let z = -radius; z <= radius; z += 1) {
      const distance = Math.hypot(x, z);
      const edgeNoise = (fbm2D(x * 0.18 + 3.1, z * 0.18 - 1.7, seed) - 0.5) * radius * 0.5;
      const edge = radius + edgeNoise;
      if (distance > edge) continue;

      const rim = distance / edge; // 0 at the centre, 1 at the rim
      let height = Math.floor(fbm2D(x * 0.22 + 50, z * 0.22 + 50, seed + 7) * (hilliness + 1) * (1 - rim * 0.55));
      if (distance <= plateauRadius) height = 0;

      const underside = Math.max(
        1,
        Math.round(Math.pow(1 - rim, 1.3) * depth + (fbm2D(x * 0.31, z * 0.31, seed + 13) - 0.5) * 3),
      );

      for (let y = -underside; y <= height; y += 1) {
        occupied.add(key(x, y, z));
        candidates.push({ x, y, z, layer: height - y, rim, depthRatio: (y + underside) / Math.max(1, underside + height) });
      }
    }
  }

  const blocks: Voxel[] = [];
  const crystals: Voxel[] = [];
  const neighbours = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ] as const;

  for (const voxel of candidates) {
    const hidden = neighbours.every(([dx, dy, dz]) => occupied.has(key(voxel.x + dx, voxel.y + dy, voxel.z + dz)));
    if (hidden) continue;

    const jitter = (random() - 0.5) * 0.18;
    let color: RGB;
    if (voxel.layer === 0) {
      color = shade(random() < 0.3 ? palette.topAlt : palette.top, jitter);
    } else if (voxel.layer === 1) {
      color = shade(palette.soil, jitter);
    } else {
      color = shade(voxel.depthRatio < 0.35 ? palette.deep : palette.stone, jitter);
    }

    const exposedUnderside = voxel.layer >= 2 && voxel.rim > 0.45;
    if (exposedUnderside && crystalChance > 0 && random() < crystalChance && palette.crystals.length > 0) {
      crystals.push({ x: voxel.x, y: voxel.y, z: voxel.z, color: palette.crystals[Math.floor(random() * palette.crystals.length)] });
    } else {
      blocks.push({ x: voxel.x, y: voxel.y, z: voxel.z, color });
    }
  }

  return { blocks, crystals, centerHeight: 0 };
}

export interface FloatingCube {
  position: [number, number, number];
  size: number;
  rotationSpeed: [number, number];
  bobPhase: number;
  bobAmplitude: number;
  glowing: boolean;
  color: RGB;
}

/** Scatters cubes through the scene while keeping the central sightline clear. */
export function generateFloatingCubes(count: number, seed: number, glowPalette: readonly RGB[], stone: RGB): FloatingCube[] {
  const random = mulberry32(seed);
  const cubes: FloatingCube[] = [];
  let attempts = 0;
  while (cubes.length < count && attempts < count * 20) {
    attempts += 1;
    const x = (random() - 0.5) * 60;
    const y = -9 + random() * 25;
    const z = -42 + random() * 50;
    // Keep the portal and headline area clear.
    if (Math.abs(x) < 7 && z > -10 && y > -3 && y < 9) continue;
    // Avoid cubes right in front of the camera.
    if (z > 6) continue;
    const glowing = random() < 0.16;
    cubes.push({
      position: [x, y, z],
      size: 0.14 + random() * (glowing ? 0.22 : 0.5),
      rotationSpeed: [(random() - 0.5) * 0.5, (random() - 0.5) * 0.5],
      bobPhase: random() * Math.PI * 2,
      bobAmplitude: 0.1 + random() * 0.35,
      glowing,
      color: glowing ? glowPalette[Math.floor(random() * glowPalette.length)] : shade(stone, (random() - 0.5) * 0.3),
    });
  }
  return cubes;
}

export interface MountainColumn {
  x: number;
  z: number;
  height: number;
  width: number;
  color: RGB;
}

/** A stepped, pixelated mountain range on a distant arc behind the islands. */
export function generateMountainRange(columns: number, seed: number, base: RGB, peak: RGB): MountainColumn[] {
  const random = mulberry32(seed);
  const result: MountainColumn[] = [];
  const startAngle = Math.PI * 1.08;
  const endAngle = Math.PI * 1.92;
  for (let index = 0; index < columns; index += 1) {
    const t = index / Math.max(1, columns - 1);
    const angle = startAngle + (endAngle - startAngle) * t;
    const distance = 70 + random() * 14;
    const ridge = fbm2D(t * 7.5, 0.5, seed, 4);
    const height = Math.max(2, Math.round((4 + ridge * 26 * (0.55 + 0.45 * Math.sin(t * Math.PI))) / 2) * 2);
    result.push({
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      height,
      width: 3.4 + random() * 1.6,
      color: height > 20 ? peak : shade(base, (random() - 0.5) * 0.2),
    });
  }
  return result;
}

/** Converts a hex colour (0xRRGGBB) to a normalized RGB triple (sRGB). */
export function hexToRgb(hex: number): RGB {
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255];
}
