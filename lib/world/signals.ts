/**
 * Tiny mutable channel between DOM interactions and the 3D scene. Values are
 * read inside the render loop, so writing them never triggers React renders.
 */
export const worldSignals = {
  /** Pointer position normalized to [-1, 1] (x right, y up). */
  pointerX: 0,
  pointerY: 0,
  /** 0..1 — raised while the primary call-to-action is hovered or focused. */
  portalBoost: 0,
  /** performance.now() timestamp of the last "enter portal" pulse. */
  pulseStartedAt: Number.NEGATIVE_INFINITY,
};

export function setPortalBoost(value: number): void {
  worldSignals.portalBoost = Math.min(1, Math.max(0, value));
}

export function triggerPortalPulse(): void {
  worldSignals.pulseStartedAt = performance.now();
}

export function setPointer(clientX: number, clientY: number, width: number, height: number): void {
  if (width <= 0 || height <= 0) return;
  worldSignals.pointerX = (clientX / width) * 2 - 1;
  worldSignals.pointerY = -((clientY / height) * 2 - 1);
}

/** Scroll progress through the hero: 0 at the top, 1 after one viewport height. */
export function getHeroScrollProgress(): number {
  if (typeof window === "undefined") return 0;
  const height = window.innerHeight || 1;
  return Math.min(1.5, Math.max(0, window.scrollY / height));
}
