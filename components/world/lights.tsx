"use client";

import { MAIN_ISLAND_Y } from "./islands";
import { WORLD_COLORS } from "./palette";

/** Cool ambient fill, a soft key from the upper left, a violet rim from behind, and an under-glow. */
export function WorldLights() {
  return (
    <>
      <ambientLight intensity={0.32} color={WORLD_COLORS.ambient} />
      <hemisphereLight args={["#5566ff", "#1a0b33", 0.7]} />
      <directionalLight position={[-9, 14, 10]} intensity={1.5} color={WORLD_COLORS.keyLight} />
      <directionalLight position={[7, 5, -14]} intensity={2.4} color={WORLD_COLORS.rimLight} />
      <directionalLight position={[10, -3, 6]} intensity={0.45} color={WORLD_COLORS.cyan} />
      <pointLight position={[0, MAIN_ISLAND_Y - 4, 2.5]} intensity={22} distance={14} decay={2} color={WORLD_COLORS.violet} />
    </>
  );
}
