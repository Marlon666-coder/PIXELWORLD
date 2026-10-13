import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { CategoryAccent } from "@/lib/categories";
import type { Poster } from "@/lib/competitions/model";
import { cn } from "@/lib/utils";
import { ACCENT_GLOW } from "./category-icon";

interface PosterFrameProps {
  poster: Poster | null;
  title: string;
  accent: CategoryAccent;
  sizes: string;
  priority?: boolean;
  className?: string;
}

/**
 * Fixed-ratio frame for gallery cards. Posters use object-contain, so nothing
 * is ever cropped; letterbox space shows a subtle pixel grid instead.
 */
export function PosterFrame({ poster, title, accent, sizes, priority = false, className }: PosterFrameProps) {
  return (
    <div className={cn("relative aspect-[4/5] overflow-hidden bg-void-850", className)}>
      <div aria-hidden="true" className={cn("absolute inset-0 bg-gradient-to-b via-transparent to-transparent", ACCENT_GLOW[accent])} />
      <div aria-hidden="true" className="pixel-grid-bg absolute inset-0 opacity-70" />
      {poster ? (
        <Image
          src={poster.url}
          alt={`Poster for ${title}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-[1.025]"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-mist-dim">
          <ImageOff className="size-8" aria-hidden="true" />
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase">No poster yet</span>
        </div>
      )}
    </div>
  );
}
