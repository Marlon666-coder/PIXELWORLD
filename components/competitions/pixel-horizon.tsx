import { mulberry32 } from "@/lib/world/procedural";

const COLUMNS = 48;
const random = mulberry32(31);
const BLOCKS = Array.from({ length: COLUMNS }, (_, index) => {
  const wave = Math.sin(index * 0.42) * 0.5 + 0.5;
  const height = 1 + Math.round((wave * 0.6 + random() * 0.4) * 4);
  const accent = random() < 0.14 ? (random() < 0.5 ? "#2de2f5" : "#9b6bff") : null;
  return { index, height, accent };
});

/**
 * Stepped pixel edge where the 3D world gives way to the quest board: the
 * explorer "rises" over the horizon as the visitor scrolls down.
 */
export function PixelHorizon() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -top-[59px] h-[60px] w-full"
      viewBox={`0 0 ${COLUMNS} 6`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      {BLOCKS.map((block) => (
        <g key={block.index}>
          <rect x={block.index} y={6 - block.height} width={1.02} height={block.height} fill="#04030b" />
          {block.accent && <rect x={block.index} y={6 - block.height - 0.35} width={1.02} height={0.35} fill={block.accent} opacity={0.75} />}
        </g>
      ))}
    </svg>
  );
}
