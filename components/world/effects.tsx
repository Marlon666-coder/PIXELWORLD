"use client";

import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import type { QualityTier } from "@/lib/world/quality";

/**
 * Selective-looking bloom: the threshold sits above 1.0, so only HDR emissive
 * materials (portal, rings, crystals, glowing cubes) bloom; the terrain does not.
 */
export function WorldEffects({ tier, multisampling }: { tier: QualityTier; multisampling: number }) {
  const high = tier === "high";
  return (
    <EffectComposer multisampling={multisampling} enableNormalPass={false}>
      <Bloom
        mipmapBlur
        luminanceThreshold={1}
        luminanceSmoothing={0.25}
        intensity={high ? 1.15 : 0.95}
        radius={0.72}
        levels={high ? 7 : 5}
        resolutionScale={high ? 0.5 : 0.35}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={high ? 0.3 : 0.2} />
    </EffectComposer>
  );
}
