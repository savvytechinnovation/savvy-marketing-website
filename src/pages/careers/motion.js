// Motion helpers shared by the company pages (same feel as the Home: masked line reveals).
import { gsap, ScrollTrigger } from '../../ds/site.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);
export { SplitText };

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/**
 * Masked line reveal for every [data-split] heading. data-split="hero" plays on load,
 * the others when they scroll into view. Hero items ([data-hero-item]) fade up after it.
 * Call inside gsap.matchMedia('(prefers-reduced-motion: no-preference)').
 */
export function splitHeadings({ heroMedia } = {}) {
  const run = () => {
    $$('[data-split]').forEach((el) => {
      const isHero = el.dataset.split === 'hero';
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        aria: 'auto',
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110,
            duration: isHero ? 1.2 : 1,
            stagger: 0.08,
            ease: 'expo.out',
            delay: isHero ? 0.15 : 0,
            scrollTrigger: isHero ? undefined : { trigger: el, start: 'top 88%' },
          }),
      });
    });
    if ($('[data-hero-item]')) gsap.from('[data-hero-item]', { y: 20, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.3 });
    if (heroMedia && $(heroMedia)) gsap.from(heroMedia, { scale: 0.96, opacity: 0, duration: 1.4, ease: 'expo.out', delay: 0.2 });
    ScrollTrigger.refresh();
  };
  document.fonts ? document.fonts.ready.then(run) : run();
}

/** "2 days ago", "1 week ago" from an ISO date (local midnight). */
export function relativeDays(iso, now = new Date()) {
  const d = new Date(`${iso}T00:00:00`);
  const days = Math.max(0, Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - d) / 86400000));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (days < 30) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

/** Refresh every [data-posted="YYYY-MM-DD"] "Posted … ago" label (static HTML is generated at build time). */
export function refreshPosted(root = document) {
  $$('[data-posted]', root).forEach((el) => {
    el.textContent = `Posted ${relativeDays(el.dataset.posted)}`;
  });
}

const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Magnetic CTA: the element drifts toward the pointer (fine pointers only, reduced motion off).
 * Uses GSAP x/y on the element itself — .btn only transitions color/box-shadow, so no conflict.
 */
export function magnetic(selector = '[data-magnetic]', strength = 0.3) {
  if (!finePointer()) return;
  $$(selector).forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => (xTo(0), yTo(0)));
  });
}

/** Hover depth: subtle 3D tilt toward the pointer on cards ([data-tilt]). Don't combine with CSS transform transitions. */
export function tilt(selector = '[data-tilt]', max = 5) {
  if (!finePointer()) return;
  $$(selector).forEach((el) => {
    gsap.set(el, { transformPerspective: 900 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * max * 2);
      rx(-((e.clientY - r.top) / r.height - 0.5) * max * 2);
    });
    el.addEventListener('pointerleave', () => (rx(0), ry(0)));
  });
}
