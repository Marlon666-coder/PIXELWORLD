"use client";

import { useRef } from "react";
import { CircleQuestionMark, Swords } from "lucide-react";
import { scrollToSection } from "@/lib/client/scroll";
import { setPortalBoost, triggerPortalPulse } from "@/lib/world/signals";
import { HowItWorksDialog } from "./how-it-works-dialog";

export function HeroActions() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div className="mt-10 flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
      <a
        href="#explore"
        className="btn btn-primary px-7 py-4 text-[0.8125rem]"
        onPointerEnter={() => setPortalBoost(1)}
        onPointerLeave={() => setPortalBoost(0)}
        onFocus={() => setPortalBoost(1)}
        onBlur={() => setPortalBoost(0)}
        onClick={(event) => {
          triggerPortalPulse();
          if (scrollToSection("explore")) event.preventDefault();
        }}
      >
        <Swords className="size-4" aria-hidden="true" />
        Explore Competitions
      </a>
      <button
        type="button"
        aria-haspopup="dialog"
        className="btn btn-secondary px-7 py-4 text-[0.8125rem]"
        onClick={() => dialogRef.current?.showModal()}
      >
        <CircleQuestionMark className="size-4" aria-hidden="true" />
        How It Works
      </button>
      <HowItWorksDialog dialogRef={dialogRef} />
    </div>
  );
}
