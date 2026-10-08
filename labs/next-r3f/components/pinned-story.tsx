'use client';

import { invalidate } from '@react-three/fiber';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useRef } from 'react';
import { scrollStore } from '@/lib/scroll-store';
import { SceneLoader } from './scene-loader';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

export function PinnedStory() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      // Scroll progress -> mutable store -> one R3F frame (demand rendering)
      ScrollTrigger.create({
        trigger: root.current,
        pin: true,
        start: 'top top',
        end: '+=1600',
        scrub: true,
        onUpdate: (self) => {
          scrollStore.progress = self.progress;
          invalidate();
        },
      });

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        SplitText.create('.story-title', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              stagger: 0.1,
              scrollTrigger: { trigger: '.story-title', start: 'top 80%' },
            }),
        });
      });
    },
    { scope: root }, // selectors resolve inside this section; everything reverts on unmount
  );

  return (
    <section ref={root} className="story">
      <div className="story-canvas">
        <SceneLoader />
      </div>
      <h2 className="story-title">The knot turns as you scroll, rendered only when progress changes.</h2>
    </section>
  );
}
