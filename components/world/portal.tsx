"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import {
  AdditiveBlending,
  Color,
  MathUtils,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type InstancedMesh,
  type Mesh,
  type PointLight,
} from "three";
import { getHeroScrollProgress, worldSignals } from "@/lib/world/signals";
import { hexToRgb, type Voxel } from "@/lib/world/procedural";
import { MAIN_ISLAND_Y } from "./islands";
import { WORLD_COLORS } from "./palette";
import { portalFragmentShader, portalVertexShader } from "./shaders";
import { VoxelInstances } from "./voxel-instances";

export const PORTAL_RADIUS = 2.3;
const FRAME_CELL = 0.36;
export const PORTAL_CENTER: [number, number, number] = [0, MAIN_ISLAND_Y + 0.25 + PORTAL_RADIUS + 0.2, 0];
const FRAGMENT_COUNT = 18;

const STONE = hexToRgb(0x2b2560);
const STONE_LIGHT = hexToRgb(0x3d3486);
const GLOW_VIOLET = hexToRgb(0x9b6bff);
const GLOW_CYAN = hexToRgb(0x2de2f5);

/** A pixelated ring of voxels in the XY plane, two cells thick. */
function buildFrame(): { stone: Voxel[]; glow: Voxel[] } {
  const stone: Voxel[] = [];
  const glow: Voxel[] = [];
  const outer = PORTAL_RADIUS + FRAME_CELL * 1.1;
  const inner = PORTAL_RADIUS - FRAME_CELL * 0.35;
  const cells = Math.ceil(outer / FRAME_CELL) + 1;
  for (let ix = -cells; ix <= cells; ix += 1) {
    for (let iy = -cells; iy <= cells; iy += 1) {
      const distance = Math.hypot(ix * FRAME_CELL, iy * FRAME_CELL);
      if (distance < inner || distance > outer) continue;
      const angle = Math.atan2(iy, ix);
      const segment = Math.round(((angle + Math.PI) / (Math.PI * 2)) * 24);
      const isGlow = segment % 4 === 0 && distance < PORTAL_RADIUS + FRAME_CELL * 0.4;
      const voxel: Voxel = {
        x: ix,
        y: iy,
        z: 0,
        color: isGlow ? (segment % 8 === 0 ? GLOW_CYAN : GLOW_VIOLET) : (ix + iy) % 3 === 0 ? STONE_LIGHT : STONE,
      };
      (isGlow ? glow : stone).push(voxel);
    }
  }
  // A small plinth so the ring sits on the island.
  const baseRow = -Math.round((PORTAL_RADIUS + FRAME_CELL) / FRAME_CELL);
  for (let ix = -3; ix <= 3; ix += 1) {
    stone.push({ x: ix, y: baseRow - 1, z: 0, color: STONE });
    if (Math.abs(ix) <= 1) stone.push({ x: ix, y: baseRow - 1, z: 1, color: STONE_LIGHT });
  }
  return { stone, glow };
}

const matrix = new Matrix4();
const position = new Vector3();
const scale = new Vector3();
const rotation = new Quaternion();
const axis = new Vector3(0.3, 1, 0.2).normalize();

export function Portal({ sparkleCount, animate }: { sparkleCount: number; animate: boolean }) {
  const frame = useMemo(() => buildFrame(), []);
  // Constructor parameters are memoized so R3F builds the material once; it is disposed on unmount.
  const materialParameters = useMemo(
    () => ({
      uniforms: {
        uTime: { value: 0 },
        uBoost: { value: 0 },
        uPixels: { value: 56 },
        uColorA: { value: new Color(WORLD_COLORS.cyan) },
        uColorB: { value: new Color(WORLD_COLORS.violet) },
        uColorC: { value: new Color(WORLD_COLORS.magenta) },
      },
      vertexShader: portalVertexShader,
      fragmentShader: portalFragmentShader,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
    [],
  );
  const materialRef = useRef<ShaderMaterial>(null);

  const fragmentSeeds = useMemo(
    () =>
      Array.from({ length: FRAGMENT_COUNT }, (_, index) => ({
        angle: (index / FRAGMENT_COUNT) * Math.PI * 2,
        radius: PORTAL_RADIUS * (1.32 + (index % 3) * 0.14),
        speed: 0.12 + (index % 5) * 0.03,
        size: 0.08 + (index % 4) * 0.035,
        depth: ((index % 5) - 2) * 0.28,
      })),
    [],
  );

  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);
  const fragments = useRef<InstancedMesh>(null);
  const light = useRef<PointLight>(null);
  const boost = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const pointerProximity = 1 - Math.min(1, Math.hypot(worldSignals.pointerX, worldSignals.pointerY * 1.4));
    const pulseAge = (performance.now() - worldSignals.pulseStartedAt) / 1000;
    const pulse = pulseAge >= 0 && pulseAge < 1.8 ? Math.sin((pulseAge / 1.8) * Math.PI) : 0;
    const target = Math.min(
      1.8,
      worldSignals.portalBoost * 0.85 + pointerProximity * 0.22 + pulse * 1.25 + getHeroScrollProgress() * 0.5,
    );
    boost.current = MathUtils.damp(boost.current, target, 3.5, Math.min(delta, 0.1));

    const material = materialRef.current;
    if (material) {
      material.uniforms.uTime.value = animate ? t : 4.2;
      material.uniforms.uBoost.value = boost.current;
    }
    if (light.current) light.current.intensity = 26 + boost.current * 34;

    if (!animate) return;
    if (ringA.current) {
      ringA.current.rotation.z = t * 0.22;
      ringA.current.rotation.x = Math.sin(t * 0.31) * 0.22;
    }
    if (ringB.current) {
      ringB.current.rotation.z = -t * 0.16;
      ringB.current.rotation.y = Math.sin(t * 0.23) * 0.35;
    }
    const mesh = fragments.current;
    if (mesh) {
      fragmentSeeds.forEach((seed, index) => {
        const angle = seed.angle + t * seed.speed * (1 + boost.current * 0.6);
        position.set(Math.cos(angle) * seed.radius, Math.sin(angle) * seed.radius * 0.94, seed.depth + Math.sin(t + index) * 0.15);
        rotation.setFromAxisAngle(axis, t * (0.6 + seed.speed));
        scale.setScalar(seed.size);
        matrix.compose(position, rotation, scale);
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={PORTAL_CENTER}>
      <mesh renderOrder={2}>
        <circleGeometry args={[PORTAL_RADIUS * 0.97, 72]} />
        <shaderMaterial ref={materialRef} args={[materialParameters]} />
      </mesh>
      <group scale={FRAME_CELL}>
        <VoxelInstances voxels={frame.stone} size={1} roughness={0.7} />
        <VoxelInstances voxels={frame.glow} size={1} glow={2.8} />
      </group>
      <mesh ref={ringA}>
        <torusGeometry args={[PORTAL_RADIUS * 1.2, 0.022, 6, 160]} />
        <meshBasicMaterial color={[0.45, 2.3, 2.7]} toneMapped={false} transparent opacity={0.8} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={ringB}>
        <torusGeometry args={[PORTAL_RADIUS * 1.36, 0.016, 6, 160]} />
        <meshBasicMaterial color={[2.1, 0.75, 2.5]} toneMapped={false} transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <instancedMesh ref={fragments} args={[undefined, undefined, FRAGMENT_COUNT]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={[1.3, 0.95, 2.6]} toneMapped={false} />
      </instancedMesh>
      <pointLight ref={light} position={[0, 0, 1.6]} color={WORLD_COLORS.cyan} intensity={26} distance={18} decay={2} />
      {sparkleCount > 0 && (
        <Sparkles count={sparkleCount} scale={[7, 6, 3.5]} size={2.6} speed={animate ? 0.35 : 0} opacity={0.8} color={WORLD_COLORS.cyan} noise={0.6} />
      )}
    </group>
  );
}
