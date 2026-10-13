"use client";

import { useMemo } from "react";
import { Color, Matrix4, Quaternion, SRGBColorSpace, Vector3 } from "three";
import type { Voxel } from "@/lib/world/procedural";

const scratchMatrix = new Matrix4();
const scratchPosition = new Vector3();
const scratchScale = new Vector3();
const identityRotation = new Quaternion();
const scratchColor = new Color();

interface VoxelInstancesProps {
  voxels: readonly Voxel[];
  size: number;
  /** > 0 renders unlit HDR colours (picked up by bloom). */
  glow?: number;
  roughness?: number;
}

/** Renders many voxels with one draw call. Matrices and colours are baked once. */
export function VoxelInstances({ voxels, size, glow = 0, roughness = 0.82 }: VoxelInstancesProps) {
  const { matrices, colors } = useMemo(() => {
    const matrixArray = new Float32Array(voxels.length * 16);
    const colorArray = new Float32Array(voxels.length * 3);
    scratchScale.setScalar(size * 0.995);
    voxels.forEach((voxel, index) => {
      scratchPosition.set(voxel.x * size, voxel.y * size, voxel.z * size);
      scratchMatrix.compose(scratchPosition, identityRotation, scratchScale);
      scratchMatrix.toArray(matrixArray, index * 16);
      scratchColor.setRGB(voxel.color[0], voxel.color[1], voxel.color[2], SRGBColorSpace);
      if (glow > 0) scratchColor.multiplyScalar(glow);
      scratchColor.toArray(colorArray, index * 3);
    });
    return { matrices: matrixArray, colors: colorArray };
  }, [voxels, size, glow]);

  if (voxels.length === 0) return null;

  return (
    <instancedMesh args={[undefined, undefined, voxels.length]}>
      <boxGeometry args={[1, 1, 1]} />
      {glow > 0 ? (
        <meshBasicMaterial toneMapped={false} />
      ) : (
        <meshStandardMaterial roughness={roughness} metalness={0.05} flatShading />
      )}
      <instancedBufferAttribute attach="instanceMatrix" args={[matrices, 16]} />
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
    </instancedMesh>
  );
}
