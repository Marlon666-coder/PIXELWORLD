import { generateIsland, mulberry32, type RGB } from "@/lib/world/procedural";
import { MAIN_ISLAND_PALETTE } from "./palette";

const VIEW_WIDTH = 1600;
const VIEW_HEIGHT = 1000;
const CELL = 22;
const ISLAND_ORIGIN = { x: 800, y: 640 };
const PORTAL = { x: 800, y: 519, radius: 101, cell: 16 };

const toHex = (color: RGB) =>
  `#${color
    .map((channel) =>
      Math.round(Math.min(1, Math.max(0, channel)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

function buildIslandSilhouette() {
  const island = generateIsland({
    radius: 10,
    seed: 1337,
    hilliness: 2,
    depth: 10,
    plateauRadius: 3.4,
    crystalChance: 0.045,
    palette: MAIN_ISLAND_PALETTE,
  });
  // Side view: keep the front-most voxel of each (x, y) column.
  const front = new Map<string, { x: number; y: number; z: number; color: RGB; glow: boolean }>();
  const consider = (voxel: { x: number; y: number; z: number; color: RGB }, glow: boolean) => {
    const key = `${voxel.x},${voxel.y}`;
    const existing = front.get(key);
    if (!existing || voxel.z > existing.z) front.set(key, { ...voxel, glow });
  };
  island.blocks.forEach((voxel) => consider(voxel, false));
  island.crystals.forEach((voxel) => consider(voxel, true));
  return Array.from(front.values());
}

function buildPortalFrame() {
  const cells: Array<{ x: number; y: number; glow: boolean }> = [];
  const { radius, cell } = PORTAL;
  const range = Math.ceil((radius + cell * 2) / cell);
  for (let ix = -range; ix <= range; ix += 1) {
    for (let iy = -range; iy <= range; iy += 1) {
      const distance = Math.hypot(ix * cell, iy * cell);
      if (distance < radius - cell * 0.3 || distance > radius + cell * 1.1) continue;
      const segment = Math.round(((Math.atan2(iy, ix) + Math.PI) / (Math.PI * 2)) * 24);
      cells.push({ x: PORTAL.x + ix * cell, y: PORTAL.y + iy * cell, glow: segment % 4 === 0 });
    }
  }
  return cells;
}

function buildStars() {
  const random = mulberry32(42);
  return Array.from({ length: 110 }, () => ({
    x: Math.round(random() * VIEW_WIDTH),
    y: Math.round(random() * VIEW_HEIGHT * 0.8),
    size: random() < 0.15 ? 3 : 2,
    opacity: 0.25 + random() * 0.6,
  }));
}

function buildCubes() {
  const random = mulberry32(7);
  return Array.from({ length: 16 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    return {
      x: 800 + side * (300 + random() * 520),
      y: 140 + random() * 700,
      size: 8 + Math.round(random() * 20),
      rotate: Math.round(random() * 45),
      glow: random() < 0.25,
    };
  });
}

// Computed once at module load: deterministic, identical on server and client.
const ISLAND = buildIslandSilhouette();
const FRAME = buildPortalFrame();
const STARS = buildStars();
const CUBES = buildCubes();

/** Static, server-rendered rendition of the pixel world (fallback and pre-load placeholder). */
export function StaticWorld() {
  return (
    <svg
      className="absolute inset-0 size-full"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      shapeRendering="crispEdges"
      role="presentation"
    >
      <defs>
        <radialGradient id="sw-sky" cx="50%" cy="52%" r="75%">
          <stop offset="0%" stopColor="#1c1255" />
          <stop offset="42%" stopColor="#0b0926" />
          <stop offset="100%" stopColor="#04030b" />
        </radialGradient>
        <radialGradient id="sw-portal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#05040e" />
          <stop offset="55%" stopColor="#1a1060" />
          <stop offset="82%" stopColor="#3b6cff" />
          <stop offset="100%" stopColor="#2de2f5" />
        </radialGradient>
        <radialGradient id="sw-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2de2f5" stopOpacity="0.38" />
          <stop offset="60%" stopColor="#9b6bff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#9b6bff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sw-planet" cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#5a45b8" />
          <stop offset="70%" stopColor="#2a1d66" />
          <stop offset="100%" stopColor="#140d38" />
        </radialGradient>
        <linearGradient id="sw-grid-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9b6bff" stopOpacity="0" />
          <stop offset="100%" stopColor="#9b6bff" stopOpacity="0.18" />
        </linearGradient>
      </defs>

      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#sw-sky)" />

      {STARS.map((star, index) => (
        <rect key={index} x={star.x} y={star.y} width={star.size} height={star.size} fill="#dfe6ff" opacity={star.opacity} />
      ))}

      <g opacity="0.85">
        <circle cx="1300" cy="200" r="190" fill="#9b6bff" opacity="0.08" />
        <circle cx="1300" cy="200" r="118" fill="url(#sw-planet)" />
        <ellipse cx="1300" cy="200" rx="200" ry="38" fill="none" stroke="#7f5cff" strokeOpacity="0.35" strokeWidth="6" transform="rotate(-14 1300 200)" />
        <circle cx="330" cy="250" r="32" fill="#4a2463" />
      </g>

      <g opacity="0.55">
        {Array.from({ length: 13 }, (_, index) => (
          <line key={`h${index}`} x1="0" x2={VIEW_WIDTH} y1={840 + index * index * 1.4} y2={840 + index * index * 1.4} stroke="url(#sw-grid-fade)" strokeWidth="1" />
        ))}
        {Array.from({ length: 25 }, (_, index) => (
          <line key={`v${index}`} x1={800 + (index - 12) * 30} y1="840" x2={800 + (index - 12) * 190} y2={VIEW_HEIGHT} stroke="url(#sw-grid-fade)" strokeWidth="1" />
        ))}
      </g>

      {CUBES.map((cube, index) => (
        <rect
          key={index}
          x={cube.x}
          y={cube.y}
          width={cube.size}
          height={cube.size}
          fill={cube.glow ? "#2de2f5" : "#2a2458"}
          opacity={cube.glow ? 0.85 : 0.9}
          transform={`rotate(${cube.rotate} ${cube.x + cube.size / 2} ${cube.y + cube.size / 2})`}
        />
      ))}

      <circle cx={PORTAL.x} cy={PORTAL.y} r={PORTAL.radius * 2.2} fill="url(#sw-halo)" />

      <g>
        {ISLAND.map((voxel) => (
          <rect
            key={`${voxel.x},${voxel.y}`}
            x={ISLAND_ORIGIN.x + voxel.x * CELL - CELL / 2}
            y={ISLAND_ORIGIN.y - voxel.y * CELL - CELL / 2}
            width={CELL}
            height={CELL}
            fill={voxel.glow ? "#2de2f5" : toHex(voxel.color)}
          />
        ))}
      </g>

      <circle cx={PORTAL.x} cy={PORTAL.y} r={PORTAL.radius} fill="url(#sw-portal)" />
      {FRAME.map((cell, index) => (
        <rect
          key={index}
          x={cell.x - PORTAL.cell / 2}
          y={cell.y - PORTAL.cell / 2}
          width={PORTAL.cell}
          height={PORTAL.cell}
          fill={cell.glow ? "#b49bff" : "#2b2560"}
        />
      ))}
    </svg>
  );
}
