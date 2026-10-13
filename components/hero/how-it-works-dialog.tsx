"use client";

import { useId, type RefObject } from "react";
import { Compass, Orbit, Swords, X } from "lucide-react";
import { scrollToSection } from "@/lib/client/scroll";

const STEPS = [
  {
    icon: Orbit,
    title: "Scan the universe",
    body: "Every poster on the quest board is a real competition uploaded by the PIXEL QUEST administrators.",
  },
  {
    icon: Compass,
    title: "Choose your quest",
    body: "Search by competition or organizer, filter by category and registration status, and sort by the nearest deadline.",
  },
  {
    icon: Swords,
    title: "Enter the portal",
    body: "Open a quest to read the full brief, check its dates, and register on the organizer's official page.",
  },
];

export function HowItWorksDialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const titleId = useId();
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="panel m-auto w-[min(92vw,44rem)] text-left text-ink backdrop:bg-void-950/80 backdrop:backdrop-blur-sm open:animate-rise"
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="scanlines relative p-6 sm:p-9">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="hud-label">Player guide</p>
            <h2 id={titleId} className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              HOW IT WORKS
            </h2>
          </div>
          <button type="button" onClick={close} className="btn btn-ghost btn-sm" aria-label="Close how it works">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <ol className="mt-8 space-y-5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="pixel-border flex size-12 shrink-0 items-center justify-center bg-void-800 text-neon-cyan">
                <step.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-mono text-xs tracking-[0.2em] text-mist uppercase">Step {index + 1}</p>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-mist">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-9 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              close();
              scrollToSection("explore");
            }}
          >
            Start exploring
          </button>
          <button type="button" className="btn btn-secondary" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
