"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { detectWorldCapabilities, type QualityTier, type WorldCapabilities } from "@/lib/world/quality";
import { getHeroScrollProgress, setPointer } from "@/lib/world/signals";
import { cn } from "@/lib/utils";
import { WorldErrorBoundary } from "./world-error-boundary";

// Three.js is only downloaded in the browser, after the page itself has rendered.
const WorldCanvas = dynamic(() => import("./world-canvas"), { ssr: false });

let cachedCapabilities: WorldCapabilities | null = null;
const getCapabilities = () => (cachedCapabilities ??= detectWorldCapabilities());
const noopSubscribe = () => () => {};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Fixed full-screen backdrop for the home page. Server-renders the static
 * artwork (also the permanent fallback without WebGL), then fades the live
 * 3D world in on top once it has rendered its first frame.
 */
export function WorldStage({ fallback }: { fallback: ReactNode }) {
  const capabilities = useSyncExternalStore(noopSubscribe, getCapabilities, () => null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
  const [tierOverride, setTierOverride] = useState<QualityTier | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => setPointer(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
    const onPointerLeave = () => setPointer(window.innerWidth / 2, window.innerHeight / 2, window.innerWidth, window.innerHeight);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      const stage = stageRef.current;
      if (!stage) return;
      const progress = getHeroScrollProgress();
      stage.style.opacity = String(1 - smoothstep(0.45, 1.05, progress) * 0.92);
      stage.style.visibility = progress > 1.3 ? "hidden" : "visible";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const handleReady = useCallback(() => setReady(true), []);
  const handleFailure = useCallback(() => setFailed(true), []);

  const showCanvas = capabilities?.webgl === true && !failed;
  const tier = tierOverride ?? capabilities?.tier ?? "medium";

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      data-world-mode={showCanvas ? (ready ? "webgl" : "loading") : capabilities ? "static" : "pending"}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-void-950"
    >
      <div className={cn("absolute inset-0 transition-opacity duration-1000", showCanvas && ready ? "opacity-0" : "opacity-100")}>
        {fallback}
      </div>
      {showCanvas && (
        <div className={cn("absolute inset-0 transition-opacity duration-1000", ready ? "opacity-100" : "opacity-0")}>
          <WorldErrorBoundary onError={handleFailure}>
            <WorldCanvas
              tier={tier}
              reducedMotion={reducedMotion}
              onReady={handleReady}
              onTierChange={setTierOverride}
              onContextLost={handleFailure}
            />
          </WorldErrorBoundary>
        </div>
      )}
    </div>
  );
}
