// Mutable store shared between DOM (GSAP/ScrollTrigger) and WebGL (useFrame).
// Plain object on purpose: writing here never triggers a React render.
export const scrollStore = { progress: 0 };

// Lab diagnostics read by run-test.mjs
type Diag = { lenisCreated: number; lenisDestroyed: number; renders: number; sceneMounts: number; sceneUnmounts: number };
export function diag(): Diag {
  const w = globalThis as unknown as { __diag?: Diag };
  w.__diag ??= { lenisCreated: 0, lenisDestroyed: 0, renders: 0, sceneMounts: 0, sceneUnmounts: 0 };
  return w.__diag;
}
