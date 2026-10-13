"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import { lowerTier, QUALITY_PRESETS, type QualityTier } from "@/lib/world/quality";
import { DistantPlanets, HoloGrid, PixelMountains, Starfield } from "./backdrop";
import { CameraRig } from "./camera-rig";
import { WorldEffects } from "./effects";
import { FloatingCubes } from "./floating-cubes";
import { CentralIsland, SatelliteIslands } from "./islands";
import { WorldLights } from "./lights";
import { WORLD_COLORS } from "./palette";
import { Portal } from "./portal";

export interface WorldCanvasProps {
  tier: QualityTier;
  reducedMotion: boolean;
  onReady: () => void;
  onTierChange: (tier: QualityTier) => void;
  onContextLost: () => void;
}

/** Stops rendering when the hero is scrolled out of view; renders on demand for reduced motion. */
function RenderGate({ reducedMotion }: { reducedMotion: boolean }) {
  const setFrameloop = useThree((state) => state.setFrameloop);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    let current: "always" | "demand" | "never" | null = null;
    const update = () => {
      const visible = window.scrollY < window.innerHeight * 1.2;
      const next = !visible ? "never" : reducedMotion ? "demand" : "always";
      if (next !== current) {
        current = next;
        setFrameloop(next);
        if (next === "demand") invalidate();
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [reducedMotion, setFrameloop, invalidate]);

  return null;
}

function ContextLossWatcher({ onContextLost }: { onContextLost: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    canvas.addEventListener("webglcontextlost", handleLost);
    return () => canvas.removeEventListener("webglcontextlost", handleLost);
  }, [gl, onContextLost]);
  return null;
}

export default function WorldCanvas({ tier, reducedMotion, onReady, onTierChange, onContextLost }: WorldCanvasProps) {
  const quality = QUALITY_PRESETS[tier];
  const animate = !reducedMotion;

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={quality.dpr}
      flat={false}
      gl={{
        antialias: !quality.postprocessing,
        alpha: false,
        stencil: false,
        powerPreference: "high-performance",
        toneMapping: ACESFilmicToneMapping,
      }}
      camera={{ position: [0, 2.6, 16.5], fov: 42, near: 0.1, far: 400 }}
      onCreated={({ gl }) => {
        gl.setClearColor(WORLD_COLORS.background, 1);
        requestAnimationFrame(() => onReady());
      }}
    >
      <color attach="background" args={[WORLD_COLORS.background]} />
      <fog attach="fog" args={[WORLD_COLORS.fog, 26, 125]} />

      <RenderGate reducedMotion={reducedMotion} />
      <ContextLossWatcher onContextLost={onContextLost} />
      <PerformanceMonitor flipflops={3} onDecline={() => onTierChange(lowerTier(tier))} onFallback={() => onTierChange("low")} />

      <WorldLights />
      <CameraRig animate={animate} />

      <Starfield count={quality.stars} animate={animate} />
      <DistantPlanets animate={animate} />
      <PixelMountains columns={quality.mountainColumns} />
      <HoloGrid animate={animate} />

      <CentralIsland animate={animate} />
      <Portal sparkleCount={quality.sparkles} animate={animate} />
      <SatelliteIslands count={quality.satelliteIslands} animate={animate} />
      <FloatingCubes count={quality.floatingCubes} animate={animate} />

      {quality.postprocessing && <WorldEffects tier={tier} multisampling={quality.multisampling} />}
    </Canvas>
  );
}
