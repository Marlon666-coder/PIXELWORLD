import { cn } from "@/lib/utils";

/** 8-bit portal glyph used in the logo. Decorative. */
export function PixelPortalGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("shrink-0", className)} aria-hidden="true" shapeRendering="crispEdges">
      <g fill="#9b6bff">
        <rect x="5" y="2" width="6" height="1" />
        <rect x="3" y="3" width="2" height="1" />
        <rect x="11" y="3" width="2" height="1" />
        <rect x="2" y="4" width="1" height="2" />
        <rect x="13" y="4" width="1" height="2" />
        <rect x="1" y="6" width="1" height="4" />
        <rect x="14" y="6" width="1" height="4" />
        <rect x="2" y="10" width="1" height="2" />
        <rect x="13" y="10" width="1" height="2" />
        <rect x="3" y="12" width="2" height="1" />
        <rect x="11" y="12" width="2" height="1" />
        <rect x="5" y="13" width="6" height="1" />
      </g>
      <g fill="#2de2f5">
        <rect x="6" y="5" width="4" height="1" />
        <rect x="5" y="6" width="1" height="4" />
        <rect x="10" y="6" width="1" height="4" />
        <rect x="6" y="10" width="4" height="1" />
      </g>
      <rect x="7" y="7" width="2" height="2" fill="#4cf08a" />
    </svg>
  );
}

export function PixelLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <PixelPortalGlyph className="size-7" />
      <span className="font-display text-lg font-bold tracking-[0.08em] text-ink">
        PIXEL<span className="text-neon-cyan">QUEST</span>
      </span>
    </span>
  );
}
