"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { getHeroScrollProgress, worldSignals } from "@/lib/world/signals";
import { PORTAL_CENTER } from "./portal";

const smoothstep = (value: number) => {
  const t = MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Cinematic camera: a fixed hero framing, gentle drift, restrained pointer
 * parallax, and a dolly toward the portal as the visitor scrolls to the explorer.
 */
export function CameraRig({ animate }: { animate: boolean }) {
  const lookTarget = useRef(new Vector3());
  const desired = useRef(new Vector3());

  useFrame((state, delta) => {
    const { camera, size } = state;
    if (!(camera instanceof PerspectiveCamera)) return;
    const target = desired.current;
    const look = lookTarget.current;
    const step = Math.min(delta, 0.1);
    const aspect = size.width / Math.max(1, size.height);
    // Pull back on portrait screens so the island and portal stay in frame.
    const portrait = aspect < 1 ? 1 + (1 - aspect) * 1.15 : 1;

    const progress = animate ? smoothstep(getHeroScrollProgress()) : 0;
    const time = animate ? state.clock.elapsedTime : 0;
    const parallax = animate ? 1 - progress * 0.7 : 0;

    const baseZ = MathUtils.lerp(16.5 * portrait, 6.2, progress);
    const baseY = MathUtils.lerp(2.6, PORTAL_CENTER[1] + 0.2, progress);
    target.set(
      worldSignals.pointerX * 1.15 * parallax + Math.sin(time * 0.13) * 0.35 * parallax,
      baseY + worldSignals.pointerY * 0.5 * parallax + Math.sin(time * 0.35) * 0.12,
      baseZ,
    );

    if (animate) {
      camera.position.x = MathUtils.damp(camera.position.x, target.x, 2.2, step);
      camera.position.y = MathUtils.damp(camera.position.y, target.y, 2.2, step);
      camera.position.z = MathUtils.damp(camera.position.z, target.z, 3, step);
    } else {
      camera.position.copy(target);
    }

    look.set(worldSignals.pointerX * 0.25 * parallax, PORTAL_CENTER[1] - 0.25 + progress * 0.25, PORTAL_CENTER[2]);
    camera.lookAt(look);

    const targetFov = MathUtils.lerp(aspect < 1 ? 52 : 42, 60, progress);
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov = animate ? MathUtils.damp(camera.fov, targetFov, 3, step) : targetFov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
