'use client';

import { ReactLenis, useLenis, type LenisRef } from 'lenis/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode } from 'react';
import { diag } from '@/lib/scroll-store';

gsap.registerPlugin(ScrollTrigger);
// Lab only: lets run-test.mjs count live ScrollTriggers
if (typeof window !== 'undefined') (window as unknown as { __ST: typeof ScrollTrigger }).__ST = ScrollTrigger;

// Global Lenis instance, driven by GSAP's ticker so ScrollTrigger and Lenis
// update in the same frame (verified in labs/01: no scrub lag).
//
// Lab finding: ref.current.lenis is NOT available yet when this component's
// effect runs, so reading it once in useEffect([]) silently never wires the
// ticker (and with autoRaf:false the page stops scrolling). Read the ref
// lazily on every tick, as the lenis/react README does.
function ScrollTriggerSync() {
  useLenis(() => ScrollTrigger.update()); // inside the provider: fires on every Lenis scroll
  return null;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const ref = useRef<LenisRef>(null);

  useEffect(() => {
    let wired = false;
    const update = (time: number) => {
      const lenis = ref.current?.lenis;
      if (!lenis) return;
      if (!wired) { wired = true; diag().lenisCreated++; }
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
      diag().lenisDestroyed++;
    };
  }, []);

  return (
    <ReactLenis root options={{ autoRaf: false }} ref={ref}>
      <ScrollTriggerSync />
      {children}
    </ReactLenis>
  );
}
