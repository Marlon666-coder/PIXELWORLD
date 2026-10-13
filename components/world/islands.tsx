"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { generateIsland } from "@/lib/world/procedural";
import { MAIN_ISLAND_PALETTE, SATELLITE_PALETTES, VOXEL_SIZE } from "./palette";
import { VoxelInstances } from "./voxel-instances";

export const MAIN_ISLAND_Y = -1.6;

export function CentralIsland({ animate }: { animate: boolean }) {
  const island = useMemo(
    () =>
      generateIsland({
        radius: 10,
        seed: 1337,
        hilliness: 2,
        depth: 10,
        plateauRadius: 3.4,
        crystalChance: 0.045,
        palette: MAIN_ISLAND_PALETTE,
      }),
    [],
  );
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!animate || !group.current) return;
    group.current.position.y = MAIN_ISLAND_Y + Math.sin(clock.elapsedTime * 0.35) * 0.1;
  });

  return (
    <group ref={group} position={[0, MAIN_ISLAND_Y, 0]}>
      <VoxelInstances voxels={island.blocks} size={VOXEL_SIZE} />
      <VoxelInstances voxels={island.crystals} size={VOXEL_SIZE} glow={3.4} />
    </group>
  );
}

interface SatelliteConfig {
  position: [number, number, number];
  radius: number;
  depth: number;
  seed: number;
  scale: number;
  phase: number;
}

const SATELLITES: SatelliteConfig[] = [
  { position: [-12.5, 3.4, -9], radius: 4, depth: 6, seed: 21, scale: 1, phase: 0.4 },
  { position: [13.5, 5.2, -15], radius: 5, depth: 7, seed: 42, scale: 1, phase: 2.1 },
  { position: [-21, -1.2, -27], radius: 6, depth: 8, seed: 77, scale: 1.1, phase: 4.2 },
  { position: [9.5, -5.8, -3], radius: 3, depth: 4, seed: 99, scale: 0.9, phase: 5.3 },
];

function SatelliteIsland({ config, paletteIndex, animate }: { config: SatelliteConfig; paletteIndex: number; animate: boolean }) {
  const island = useMemo(
    () =>
      generateIsland({
        radius: config.radius,
        seed: config.seed,
        hilliness: 2,
        depth: config.depth,
        crystalChance: 0.06,
        palette: SATELLITE_PALETTES[paletteIndex % SATELLITE_PALETTES.length],
      }),
    [config, paletteIndex],
  );
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!animate || !group.current) return;
    const t = clock.elapsedTime * 0.4 + config.phase;
    group.current.position.y = config.position[1] + Math.sin(t) * 0.35;
    group.current.rotation.y = Math.sin(t * 0.3) * 0.08;
  });

  return (
    <group ref={group} position={config.position} scale={config.scale}>
      <VoxelInstances voxels={island.blocks} size={VOXEL_SIZE} />
      <VoxelInstances voxels={island.crystals} size={VOXEL_SIZE} glow={3} />
    </group>
  );
}

export function SatelliteIslands({ count, animate }: { count: number; animate: boolean }) {
  return (
    <>
      {SATELLITES.slice(0, count).map((config, index) => (
        <SatelliteIsland key={config.seed} config={config} paletteIndex={index} animate={animate} />
      ))}
    </>
  );
}
