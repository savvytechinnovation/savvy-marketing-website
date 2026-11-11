// Motion helpers shared by the Resources hub and article pages.
import { gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Masked line reveal for [data-split] headings (first one plays on load, the rest on scroll). */
export function splitHeadings(selector = '[data-split]') {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const run = () => {
      document.querySelectorAll(selector).forEach((el, i) => {
        SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          aria: 'auto',
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: i === 0 ? 1.2 : 1,
              stagger: 0.08,
              ease: 'expo.out',
              delay: i === 0 ? 0.15 : 0,
              scrollTrigger: i === 0 ? undefined : { trigger: el, start: 'top 88%' },
            }),
        });
      });
      if (document.querySelector('[data-hero-item]')) gsap.from('[data-hero-item]', { y: 20, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.3, clearProps: 'transform,opacity' });
      ScrollTrigger.refresh();
    };
    document.fonts ? document.fonts.ready.then(run) : run();
  });
}

/** 3D tilt toward the pointer on cards (GSAP owns `transform` on .rcard; CSS hovers use `translate`). */
export function tiltCards(selector = '.rcard', max = 6) {
  if (reduceMotion || !finePointer()) return;
  document.querySelectorAll(selector).forEach((card) => {
    if (card.dataset.tilt) return;
    card.dataset.tilt = '1';
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
    gsap.set(card, { transformPerspective: 900 });
    const media = card.querySelector('.rcard__media');
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      ry((x - 0.5) * max);
      rx(-(y - 0.5) * max);
      media?.style.setProperty('--mx', `${x * 100}%`);
      media?.style.setProperty('--my', `${y * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
    });
  });
}

/** Magnetic pull on primary CTAs (translate only; the DS button animates its own pseudo-elements). */
export function magnetic(selector = '.soft-cta .btn, [data-magnetic]', strength = 0.25) {
  if (reduceMotion || !finePointer()) return;
  document.querySelectorAll(selector).forEach((btn) => {
    const x = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
    const y = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * strength);
      y((e.clientY - (r.top + r.height / 2)) * strength);
    });
    btn.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

/** Cards rise in as they enter the viewport (animates the inner link so Flip/tilt keep their own transforms). */
export function cardsEnter(selector = '.rcard__link') {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.set(selector, { opacity: 0, y: 32 });
    ScrollTrigger.batch(selector, {
      start: 'top 92%',
      once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity' }),
    });
  });
}
