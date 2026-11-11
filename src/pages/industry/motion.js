// Shared motion helpers for Growth System, Industries and 404 (page-local, not DS).
import { gsap, ScrollTrigger } from '../../ds/site.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** Masked line reveal for [data-split] headings (hero = id ending in "hero-title" plays on load). */
export function initHeadings(mm) {
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const run = () => {
      $$('[data-split]').forEach((el) => {
        const isHero = el.hasAttribute('data-split-hero');
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
      gsap.from('[data-hero-item]', { y: 20, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.3 });
      ScrollTrigger.refresh();
    };
    document.fonts ? document.fonts.ready.then(run) : run();
  });
}

/** Keyboard support for a roving set of buttons (arrow keys / Home / End). */
export function rovingKeys(buttons, onMove, { vertical = false } = {}) {
  buttons.forEach((b, i) =>
    b.addEventListener('keydown', (e) => {
      const next = { ArrowRight: 1, ArrowLeft: -1, ...(vertical ? { ArrowDown: 1, ArrowUp: -1 } : {}) }[e.key];
      let to = null;
      if (next) to = (i + next + buttons.length) % buttons.length;
      if (e.key === 'Home') to = 0;
      if (e.key === 'End') to = buttons.length - 1;
      if (to === null) return;
      e.preventDefault();
      buttons[to].focus();
      onMove(to, buttons[to]);
    }),
  );
}

const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Magnetic CTAs: buttons drift toward the pointer (GSAP x/y; the DS .btn only transitions colors). */
export function initMagnetic(selector = 'main .btn') {
  if (!fine()) return;
  $$(selector).forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.25);
      y((e.clientY - (r.top + r.height / 2)) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

/** Hover depth on [data-tilt-card]: rotationX/Y via GSAP (CSS never transitions transform on these). */
export function initTilt(selector = '[data-tilt-card]', max = 4) {
  if (!fine()) return;
  $$(selector).forEach((el) => {
    gsap.set(el, { transformPerspective: 900 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * max * 2);
      rx(-((e.clientY - r.top) / r.height - 0.5) * max * 2);
    });
    el.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
    });
  });
}

/** role=radio / role=tab groups: click + arrow keys; calls onSelect(index, button). Returns select(i). */
export function radioGroup(buttons, onSelect, attrName = 'aria-checked') {
  const select = (i, focus) => {
    buttons.forEach((b, k) => {
      b.setAttribute(attrName, String(k === i));
      b.tabIndex = k === i ? 0 : -1;
    });
    if (focus) buttons[i].focus();
    onSelect(i, buttons[i]);
  };
  buttons.forEach((b, i) => b.addEventListener('click', () => select(i)));
  rovingKeys(buttons, (i) => select(i, true));
  return select;
}
