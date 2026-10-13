"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";

export function ShareButton({ title }: { title: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const share = async () => {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2400);
  };

  return (
    <button type="button" onClick={share} className="btn btn-ghost btn-sm">
      {state === "copied" ? <Check className="size-4 text-neon-green" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
      <span aria-live="polite">
        {state === "copied" ? "Link copied" : state === "failed" ? "Copy failed" : "Share quest"}
      </span>
    </button>
  );
}
