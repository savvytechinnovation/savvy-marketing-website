// Small helpers shared by the Results hub, case pages, portal and legal pages.
import { gsap, ScrollTrigger, lenis } from '../../ds/site.js';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/**
 * Keeps `--hdr-h` on <html> equal to the bottom edge of the fixed site header, so sticky bars (filters, TOC)
 * sit right under it while the header compacts / expands on scroll.
 */
export function trackHeaderOffset() {
  const header = $('[data-header]') || $('.site-header');
  if (!header) return;
  let raf = 0;
  const update = () => {
    raf = 0;
    const b = Math.max(0, Math.round(header.getBoundingClientRect().bottom));
    document.documentElement.style.setProperty('--hdr-h', `${b}px`);
  };
  const queue = () => (raf ||= requestAnimationFrame(update));
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  header.addEventListener('transitionend', queue);
  // the header animates `top` / max-height for ~450ms after a direction change
  addEventListener('scroll', () => setTimeout(queue, 480), { passive: true });
  update();
}

/** Masked line reveal for [data-split] headings (same motion as the Home), plus [data-hero-item] fade-ups. */
export function revealHeadings(mm = gsap.matchMedia()) {
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const run = () => {
      $$('[data-split]').forEach((el) => {
        const inHero = !!el.closest('[class*="hero"]');
        SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          aria: 'auto',
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: inHero ? 1.2 : 1,
              stagger: 0.08,
              ease: 'expo.out',
              delay: inHero ? 0.15 : 0,
              scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 88%' },
            }),
        });
      });
      if ($$('[data-hero-item]').length) gsap.from('[data-hero-item]', { y: 20, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.3, clearProps: 'transform,opacity' });
      ScrollTrigger.refresh();
    };
    document.fonts ? document.fonts.ready.then(run) : run();
  });
  return mm;
}

/**
 * Scroll-spy for an "On this page" list. `links` are anchors whose href is "#id".
 * Calls onChange(id) when the section crossing the reading line changes. Returns a cleanup function.
 */
export function scrollSpy(links, onChange, { line = 0.35 } = {}) {
  const targets = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  let current = null;
  const set = (id) => {
    if (id === current) return;
    current = id;
    links.forEach((a) => {
      const on = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    onChange?.(id);
  };
  const triggers = targets.map((el, i) =>
    ScrollTrigger.create({
      trigger: el,
      start: `top ${line * 100}%`,
      end: `bottom ${line * 100}%`,
      onToggle: (self) => self.isActive && set(el.id),
      onLeaveBack: () => i === 0 && set(el.id),
    }),
  );
  if (targets[0]) set(targets[0].id);
  return () => triggers.forEach((t) => t.kill());
}

/**
 * Magnetic CTAs: the element drifts toward the pointer (GSAP x/y — .btn only transitions colour/shadow in CSS,
 * so there is no transform conflict). Fine pointers only, off for reduced motion.
 */
export function magnetic(els, strength = 0.25) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  els.forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/** Hover depth: subtle 3D tilt of an element toward the pointer (uses rotationX/Y; don't use on Flip targets). */
export function tilt(el, max = 6) {
  if (!el || !matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.set(el, { transformPerspective: 1000 });
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
}

/**
 * In-page jumps from a sticky "On this page" list. Runs in the capture phase (before site.js's generic anchor
 * handler), collapses the mobile dropdown first, then scrolls so the section clears the header + sticky TOC.
 */
export function tocJump(toc, close) {
  toc.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      close();
      requestAnimationFrame(() => {
        const hdr = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 0;
        const sticky = getComputedStyle(toc).position === 'sticky' && toc.getBoundingClientRect().width > innerWidth * 0.6 ? toc.offsetHeight : 0;
        // Lenis already subtracts the target's scroll-margin-top (kept in CSS for no-JS anchors), so add it back
        const offset = -(Math.max(hdr, 80) + sticky + 16) + (lenis ? parseFloat(getComputedStyle(target).scrollMarginTop) || 0 : 0);
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (lenis) lenis.scrollTo(target, { offset, duration: reduce ? 0 : 1.2 });
        else scrollTo({ top: target.getBoundingClientRect().top + scrollY + offset, behavior: reduce ? 'auto' : 'smooth' });
        history.replaceState(null, '', `#${target.id}`);
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    },
    true,
  );
}
