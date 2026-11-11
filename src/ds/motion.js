// Global motion layer — runs on every page via initSite().
//  - First-visit preloader (isologo draws itself in 3D, counter 0→100, curtain lifts)
//  - Page transitions: internal links close a two-tone curtain, the next page opens it
//  - Custom cursor (fine pointers): dot + ring, grows on interactive elements,
//    labels via [data-cursor="view" | "drag" | "link" | any text]
//  - Scroll-velocity skew on [data-skew]
//  - Scroll progress hairline + film grain
// Everything is skipped or static with prefers-reduced-motion.
import './motion.css';
import { gsap } from 'gsap';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Automated browsers (Playwright tests) skip the preloader/transition curtain unless ?fx=1
const automated = navigator.webdriver && !/[?&]fx=1\b/.test(location.search);
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const KEY = 'savvy:transition';
const SEEN = 'savvy:preloaded';
const store = {
  get: (k) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {}
  },
  del: (k) => {
    try {
      sessionStorage.removeItem(k);
    } catch {}
  },
};

const el = (tag, cls, html = '') => {
  const n = document.createElement(tag);
  n.className = cls;
  n.innerHTML = html;
  return n;
};

const ISO = `<svg viewBox="0 0 100 100" aria-hidden="true"><path pathLength="1" d="M50 6 88 28v44L50 94 12 72V28Z"/><path pathLength="1" d="M66 36c-4-6-10-8-17-8-9 0-15 5-15 12 0 15 32 8 32 23 0 7-7 12-16 12-8 0-14-3-18-9"/></svg>`;

export function initMotion({ lenis } = {}) {
  if (document.documentElement.dataset.motion === 'on') return;
  document.documentElement.dataset.motion = 'on';
  initGrain();
  initProgress();
  initTransitions();
  if (fine && !reduce) initCursor();
  if (!reduce) initSkew(lenis);
}

// ---------------------------------------------------------------------------
function initGrain() {
  document.body.append(el('div', 'fx-grain'));
}

function initProgress() {
  const bar = el('div', 'fx-progress');
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);
  const set = gsap.quickSetter(bar, 'scaleX');
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    set(max > 0 ? scrollY / max : 0);
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
}

// ---------------------------------------------------------------------------
// Preloader + page transitions share one curtain
// ---------------------------------------------------------------------------
function initTransitions() {
  const curtain = el(
    'div',
    'fx-curtain',
    `<div class="fx-curtain__a"></div><div class="fx-curtain__b"><div class="fx-curtain__mark">${ISO}</div><span class="fx-curtain__count" aria-hidden="true">0</span></div>`,
  );
  curtain.setAttribute('aria-hidden', 'true');
  document.body.append(curtain);
  const a = curtain.querySelector('.fx-curtain__a');
  const b = curtain.querySelector('.fx-curtain__b');
  const mark = curtain.querySelector('.fx-curtain__mark');
  const count = curtain.querySelector('.fx-curtain__count');
  const paths = curtain.querySelectorAll('path');
  gsap.set([a, b], { yPercent: 100 });

  const hide = () => gsap.set(curtain, { autoAlpha: 0 });
  const open = (delay = 0) =>
    gsap
      .timeline({ delay, onComplete: hide })
      .to(mark, { scale: 0.8, opacity: 0, duration: 0.35, ease: 'power2.in' })
      .to(b, { yPercent: -100, duration: 0.8, ease: 'expo.inOut' }, '<0.1')
      .to(a, { yPercent: -100, duration: 0.8, ease: 'expo.inOut' }, '<0.08');

  const firstVisit = !store.get(SEEN);
  const arriving = store.get(KEY) === '1';
  store.del(KEY);

  if (reduce || automated) hide();
  else if (arriving) {
    // Coming from an internal link: curtain starts closed, then opens
    gsap.set([a, b], { yPercent: 0 });
    gsap.set(mark, { opacity: 1, scale: 1 });
    gsap.set(paths, { strokeDashoffset: 0 });
    count.hidden = true;
    open(0.05);
  } else if (firstVisit) {
    store.set(SEEN, '1');
    gsap.set([a, b], { yPercent: 0 });
    const n = { v: 0 };
    gsap
      .timeline()
      .fromTo(mark, { rotationY: -90, rotationX: 20, opacity: 0 }, { rotationY: 0, rotationX: 0, opacity: 1, duration: 1, ease: 'expo.out', transformPerspective: 600 })
      .fromTo(paths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.15 }, 0)
      .to(n, { v: 100, duration: 1.3, ease: 'power2.inOut', onUpdate: () => (count.textContent = Math.round(n.v)) }, 0)
      .to(mark, { rotationY: 360, duration: 0.9, ease: 'power3.inOut' }, '-=0.2')
      .add(() => open().play(), '-=0.25');
  } else hide();

  document.documentElement.classList.remove('fx-cover');
  // Back/forward cache: never show a closed curtain
  addEventListener('pageshow', (e) => e.persisted && hide());

  if (reduce || automated) return;
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target && link.target !== '_self') return;
    if (link.hasAttribute('download') || link.dataset.noTransition !== undefined) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // hash / same page
    if (/\.(pdf|ics|zip|png|jpe?g|svg|webp)$/i.test(url.pathname)) return;
    e.preventDefault();
    store.set(KEY, '1');
    count.hidden = true;
    gsap.set(curtain, { autoAlpha: 1 });
    gsap.set(paths, { strokeDashoffset: 0 });
    gsap
      .timeline({ onComplete: () => location.assign(url.href) })
      .fromTo(a, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.inOut' })
      .fromTo(b, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: 'expo.inOut' }, '<0.08')
      .fromTo(mark, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3 }, '-=0.15');
    // Safety: navigate even if the tween is throttled (background tab)
    setTimeout(() => location.assign(url.href), 1200);
  });
}

// ---------------------------------------------------------------------------
// Cursor
// ---------------------------------------------------------------------------
function initCursor() {
  const dot = el('div', 'fx-cursor__dot');
  const ring = el('div', 'fx-cursor__ring', '<span class="fx-cursor__label"></span>');
  [dot, ring].forEach((n) => n.setAttribute('aria-hidden', 'true'));
  document.body.append(ring, dot);
  document.documentElement.classList.add('has-fx-cursor');
  const label = ring.firstElementChild;
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  let shown = false;

  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) {
        shown = true;
        gsap.set([dot, ring], { x: e.clientX, y: e.clientY });
        document.documentElement.classList.add('fx-cursor-on');
      }
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);
      const t = e.target instanceof Element ? e.target : null;
      const custom = t?.closest('[data-cursor]');
      const text = t?.closest('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select, [contenteditable]');
      const interactive = t?.closest('a, button, [role=button], [role=tab], label, summary, .btn');
      ring.classList.toggle('is-text', !!text);
      ring.classList.toggle('is-hover', !!interactive && !custom && !text);
      ring.classList.toggle('is-label', !!custom);
      dot.classList.toggle('is-hidden', !!custom || !!text);
      if (custom) {
        const v = custom.dataset.cursor;
        label.textContent = { view: 'View', drag: 'Drag', link: 'Open' }[v] ?? v;
      }
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => document.documentElement.classList.remove('fx-cursor-on'));
  document.addEventListener('pointerenter', () => shown && document.documentElement.classList.add('fx-cursor-on'));
  addEventListener('pointerdown', () => ring.classList.add('is-down'));
  addEventListener('pointerup', () => ring.classList.remove('is-down'));
}

// ---------------------------------------------------------------------------
// Scroll-velocity skew
// ---------------------------------------------------------------------------
function initSkew(lenis) {
  const targets = [...document.querySelectorAll('[data-skew]')];
  if (!targets.length) return;
  const setters = targets.map((t) => gsap.quickTo(t, 'skewY', { duration: 0.5, ease: 'power3' }));
  let last = scrollY;
  let lastT = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now();
    const v = lenis ? lenis.velocity : ((scrollY - last) / Math.max(now - lastT, 1)) * 16;
    last = scrollY;
    lastT = now;
    const skew = gsap.utils.clamp(-6, 6, v * 0.25);
    setters.forEach((s) => s(skew));
  });
}
