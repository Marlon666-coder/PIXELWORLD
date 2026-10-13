"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  type Group,
  type InstancedMesh,
} from "three";
import { generateMountainRange, hexToRgb } from "@/lib/world/procedural";
import { WORLD_COLORS } from "./palette";
import { gridFragmentShader, gridVertexShader } from "./shaders";

const GROUND_Y = -15;

function createGlowTexture(inner: string, outer: string): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.45, outer);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function DistantPlanets({ animate }: { animate: boolean }) {
  const planet = useRef<Group>(null);
  const glow = useMemo(() => createGlowTexture("rgba(155,107,255,0.55)", "rgba(80,40,180,0.18)"), []);
  useEffect(() => () => glow?.dispose(), [glow]);

  useFrame(({ clock }) => {
    if (!animate || !planet.current) return;
    planet.current.rotation.y = clock.elapsedTime * 0.012;
  });

  return (
    <>
      <group position={[46, 27, -118]}>
        {glow && (
          <sprite scale={[58, 58, 1]}>
            <spriteMaterial map={glow} blending={AdditiveBlending} depthWrite={false} transparent fog={false} />
          </sprite>
        )}
        <group ref={planet} rotation={[0.25, 0, 0.18]}>
          <mesh>
            <icosahedronGeometry args={[15, 3]} />
            <meshStandardMaterial color="#3b2b80" emissive="#170c3c" emissiveIntensity={0.9} roughness={0.9} flatShading fog={false} />
          </mesh>
          <mesh rotation={[Math.PI / 2.25, 0, 0]}>
            <ringGeometry args={[19, 25, 72, 1]} />
            <meshBasicMaterial color="#7f5cff" transparent opacity={0.16} side={DoubleSide} depthWrite={false} fog={false} />
          </mesh>
        </group>
      </group>
      <mesh position={[-52, 19, -100]} rotation={[0.4, 0.6, 0]}>
        <icosahedronGeometry args={[4.2, 2]} />
        <meshStandardMaterial color="#6a2f7d" emissive="#2a0f36" emissiveIntensity={0.8} roughness={0.85} flatShading fog={false} />
      </mesh>
    </>
  );
}

const mountainMatrix = new Matrix4();
const mountainPosition = new Vector3();
const mountainScale = new Vector3();
const noRotation = new Quaternion();
const mountainColor = new Color();

export function PixelMountains({ columns }: { columns: number }) {
  const range = useMemo(
    () => generateMountainRange(columns, 808, hexToRgb(0x1a1640), hexToRgb(0x2b2266)),
    [columns],
  );
  const mesh = useRef<InstancedMesh>(null);

  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    range.forEach((column, index) => {
      mountainPosition.set(column.x, GROUND_Y + column.height / 2, column.z);
      mountainScale.set(column.width, column.height, column.width);
      mountainMatrix.compose(mountainPosition, noRotation, mountainScale);
      instanced.setMatrixAt(index, mountainMatrix);
      mountainColor.setRGB(column.color[0], column.color[1], column.color[2], SRGBColorSpace);
      instanced.setColorAt(index, mountainColor);
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [range]);

  return (
    <instancedMesh key={range.length} ref={mesh} args={[undefined, undefined, range.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.95} flatShading />
    </instancedMesh>
  );
}

export function HoloGrid({ animate }: { animate: boolean }) {
  const materialParameters = useMemo(
    () => ({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(WORLD_COLORS.violet) },
        uAccent: { value: new Color(WORLD_COLORS.cyan) },
      },
      vertexShader: gridVertexShader,
      fragmentShader: gridFragmentShader,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
    [],
  );
  const materialRef = useRef<ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (animate && materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y + 0.02, -30]}>
      <planeGeometry args={[260, 200, 1, 1]} />
      <shaderMaterial ref={materialRef} args={[materialParameters]} />
    </mesh>
  );
}

export function Starfield({ count, animate }: { count: number; animate: boolean }) {
  return <Stars radius={140} depth={70} count={count} factor={3.2} saturation={0.35} fade speed={animate ? 0.35 : 0} />;
}
