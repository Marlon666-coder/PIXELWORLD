"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Euler, Matrix4, Quaternion, SRGBColorSpace, Vector3, type InstancedMesh } from "three";
import { generateFloatingCubes, type FloatingCube } from "@/lib/world/procedural";
import { GLOW_COLORS, STONE_COLOR } from "./palette";

const matrix = new Matrix4();
const position = new Vector3();
const scale = new Vector3();
const quaternion = new Quaternion();
const euler = new Euler();
const color = new Color();

function writeInstances(mesh: InstancedMesh, cubes: FloatingCube[], time: number, glowScale: number) {
  cubes.forEach((cube, index) => {
    const bob = Math.sin(time * 0.5 + cube.bobPhase) * cube.bobAmplitude;
    position.set(cube.position[0], cube.position[1] + bob, cube.position[2]);
    euler.set(time * cube.rotationSpeed[0] + cube.bobPhase, time * cube.rotationSpeed[1], 0);
    quaternion.setFromEuler(euler);
    scale.setScalar(cube.size);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
    if (time === 0) {
      color.setRGB(cube.color[0], cube.color[1], cube.color[2], SRGBColorSpace);
      if (glowScale > 0) color.multiplyScalar(glowScale);
      mesh.setColorAt(index, color);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (time === 0 && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export function FloatingCubes({ count, animate }: { count: number; animate: boolean }) {
  const cubes = useMemo(() => generateFloatingCubes(count, 2024, GLOW_COLORS, STONE_COLOR), [count]);
  const stoneCubes = useMemo(() => cubes.filter((cube) => !cube.glowing), [cubes]);
  const glowCubes = useMemo(() => cubes.filter((cube) => cube.glowing), [cubes]);
  const stoneMesh = useRef<InstancedMesh>(null);
  const glowMesh = useRef<InstancedMesh>(null);

  useEffect(() => {
    if (stoneMesh.current) writeInstances(stoneMesh.current, stoneCubes, 0, 0);
    if (glowMesh.current) writeInstances(glowMesh.current, glowCubes, 0, 3);
  }, [stoneCubes, glowCubes]);

  useFrame(({ clock }) => {
    if (!animate) return;
    const time = clock.elapsedTime + 0.0001;
    if (stoneMesh.current) writeInstances(stoneMesh.current, stoneCubes, time, 0);
    if (glowMesh.current) writeInstances(glowMesh.current, glowCubes, time, 3);
  });

  return (
    <>
      {stoneCubes.length > 0 && (
        <instancedMesh key={`stone-${stoneCubes.length}`} ref={stoneMesh} args={[undefined, undefined, stoneCubes.length]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.75} metalness={0.1} flatShading />
        </instancedMesh>
      )}
      {glowCubes.length > 0 && (
        <instancedMesh key={`glow-${glowCubes.length}`} ref={glowMesh} args={[undefined, undefined, glowCubes.length]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}
    </>
  );
}
