import { ChevronDown } from "lucide-react";
import { StaticWorld } from "@/components/world/static-world";
import { WorldStage } from "@/components/world/world-stage";
import { SITE } from "@/lib/config";
import { HeroActions } from "./hero-actions";

function HudCorner({ className }: { className: string }) {
  return <span aria-hidden="true" className={`absolute size-5 border-neon-cyan/50 ${className}`} />;
}

/** Decorative heads-up display. These labels are flavour text, not live data. */
function HudOverlay() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute inset-x-4 top-24 bottom-6 sm:inset-x-8 sm:top-28 sm:bottom-8">
        <HudCorner className="top-0 left-0 border-t-2 border-l-2" />
        <HudCorner className="top-0 right-0 border-t-2 border-r-2" />
        <HudCorner className="bottom-0 left-0 border-b-2 border-l-2" />
        <HudCorner className="right-0 bottom-0 border-r-2 border-b-2" />

        <div className="absolute top-4 left-6 hidden space-y-1 md:block">
          <p className="hud-label text-ink/80">World: Pixel Universe</p>
          <p className="hud-label text-mist-dim">Sector · Discovery</p>
        </div>

        <div className="absolute top-4 right-6 hidden items-center gap-2 md:flex">
          <span className="size-2 animate-pulse-soft bg-neon-green shadow-[0_0_10px_#4cf08a]" />
          <p className="hud-label text-ink/80">Quest Status: Ready</p>
        </div>

        <div className="absolute bottom-4 left-6 hidden items-center gap-3 lg:flex">
          <span className="relative block size-9 border border-neon-cyan/40">
            <span className="absolute inset-[5px] border border-neon-cyan/30" />
            <span className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 bg-neon-cyan" />
          </span>
          <p className="hud-label">
            New challenges await<span className="ml-1 inline-block animate-blink text-neon-cyan">_</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <WorldStage fallback={<StaticWorld />} />

      {/* Readability: a soft dark halo behind the headline and a fade into the explorer. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_58%_40%_at_50%_52%,rgb(4_3_11/0.6),transparent_75%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-40 bg-gradient-to-b from-void-950/80 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-48 bg-gradient-to-b from-transparent to-void-950" />

      <HudOverlay />

      <div className="relative z-20 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-5 pt-28 pb-28 text-center">
        <p className="hud-label animate-rise text-neon-cyan">◆ New challenges await ◆</p>
        <h1
          id="hero-title"
          className="mt-6 animate-rise font-display leading-[0.88] font-bold tracking-tight [animation-delay:120ms] drop-shadow-[0_6px_0_rgb(4_3_11/0.6)]"
        >
          <span className="block text-[clamp(2.5rem,9.6vw,8.5rem)] text-ink">{SITE.headline[0]}</span>
          <span className="block text-[clamp(2.5rem,9.6vw,8.5rem)] text-quest-gradient">{SITE.headline[1]}</span>
        </h1>
        <p className="mt-7 max-w-xl animate-rise text-base leading-relaxed text-mist [animation-delay:240ms] sm:text-lg">
          {SITE.tagline}
        </p>
        <div className="w-full animate-rise [animation-delay:360ms] sm:w-auto">
          <HeroActions />
        </div>
      </div>

      <a
        href="#explore"
        className="group absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 px-3 py-2 text-mist hover:text-ink"
      >
        <span className="hud-label text-inherit">Scroll to explore</span>
        <ChevronDown className="size-5 animate-chevron text-neon-cyan" aria-hidden="true" />
      </a>
    </section>
  );
}
