"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { ExternalLink, ImageOff, Maximize2, X } from "lucide-react";
import type { Poster } from "@/lib/competitions/model";

export function PosterViewer({ poster, title }: { poster: Poster | null; title: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();

  if (!poster) {
    return (
      <div className="panel flex aspect-[3/4] flex-col items-center justify-center gap-3 text-mist-dim">
        <ImageOff className="size-10" aria-hidden="true" />
        <p className="font-mono text-xs tracking-[0.2em] uppercase">Poster not available</p>
      </div>
    );
  }

  const hasDimensions = Boolean(poster.width && poster.height);
  const openViewer = () => {
    setOpen(true);
    dialogRef.current?.showModal();
  };
  const closeViewer = () => dialogRef.current?.close();

  return (
    <>
      <figure className="panel relative overflow-hidden p-3 sm:p-4">
        <button type="button" onClick={openViewer} className="group relative block w-full cursor-zoom-in" aria-label={`View the full-size poster for ${title}`}>
          {hasDimensions ? (
            <Image
              src={poster.url}
              alt={`Poster for ${title}`}
              width={poster.width!}
              height={poster.height!}
              sizes="(min-width: 1280px) 620px, (min-width: 1024px) 50vw, 100vw"
              priority
              className="h-auto max-h-[80vh] w-full object-contain"
            />
          ) : (
            <span className="relative block aspect-[3/4] w-full">
              <Image
                src={poster.url}
                alt={`Poster for ${title}`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
                className="object-contain"
              />
            </span>
          )}
          <span className="absolute right-3 bottom-3 inline-flex items-center gap-2 bg-void-950/85 px-3 py-2 font-mono text-[11px] tracking-[0.18em] text-ink uppercase opacity-90 transition-opacity group-hover:opacity-100">
            <Maximize2 className="size-3.5" aria-hidden="true" />
            Full size
          </span>
        </button>
        <figcaption className="sr-only">Competition poster for {title}</figcaption>
      </figure>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeViewer();
        }}
        className="m-auto max-h-[96vh] max-w-[96vw] bg-transparent p-0 text-ink backdrop:bg-void-950/92"
      >
        <div className="flex max-h-[96vh] flex-col items-center gap-3 p-2">
          <div className="flex w-full items-center justify-between gap-4">
            <p id={titleId} className="hud-label truncate text-ink">
              {title}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <a href={poster.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                <ExternalLink className="size-4" aria-hidden="true" />
                Original
              </a>
              <button type="button" onClick={closeViewer} className="btn btn-secondary btn-sm" aria-label="Close full-size poster">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          {open && (
            // The untouched original upload, only fetched when the viewer opens.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster.url} alt={`Full-size poster for ${title}`} className="max-h-[86vh] w-auto max-w-full object-contain" />
          )}
        </div>
      </dialog>
    </>
  );
}
