// Round-2 DOM motion helpers shared by Resources, articles and the company pages.
// Everything is a no-op (or a static end state) under prefers-reduced-motion.
import { gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion;

/** Title characters flip up in 3D (rotateX from below, staggered), masked per line. */
export function chars3D(el, { delay = 0.1, stagger = 0.022, scroll = false } = {}) {
  if (!el || reduceMotion) return null;
  let tween;
  const split = SplitText.create(el, {
    type: 'lines,words,chars',
    mask: 'lines',
    autoSplit: true,
    aria: 'auto',
    onSplit(self) {
      tween?.kill();
      gsap.set(self.lines, { perspective: 700 });
      tween = gsap.from(self.chars, {
        yPercent: 110,
        rotationX: -95,
        z: -60,
        opacity: 0,
        transformOrigin: '50% 100% -12px',
        duration: 1.25,
        ease: 'expo.out',
        stagger,
        delay,
        scrollTrigger: scroll ? { trigger: el, start: 'top 85%' } : undefined,
      });
      return tween;
    },
  });
  return split;
}

/** Scramble micro labels in when they enter the viewport. */
export function scrambleIn(selector = '[data-scramble]') {
  if (reduceMotion) return;
  $$(selector).forEach((el) => {
    const text = el.textContent;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: () => gsap.to(el, { duration: 1.1, scrambleText: { text, chars: '01·/—+×', speed: 0.6 }, ease: 'none' }),
    });
  });
}

/** Infinite marquee whose speed and skew follow the scroll velocity. el > .vmq__track (content duplicated by JS). */
export function velocityMarquee(el, { speed = 60, dir = 1 } = {}) {
  if (!el) return;
  const track = el.querySelector('.vmq__track');
  if (!track) return;
  const clone = track.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  el.append(clone);
  if (reduceMotion) return;
  const tracks = [track, clone];
  let x = 0;
  let boost = 0;
  let skew = 0;
  const setSkew = gsap.quickSetter([track, clone], 'skewX', 'deg');
  const st = ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top' });
  gsap.ticker.add((_, dt) => {
    if (!st.isActive) return;
    const v = st.getVelocity() / 1000;
    boost += (v - boost) * 0.08;
    skew += (gsap.utils.clamp(-10, 10, v * 2.2) - skew) * 0.1;
    const w = track.offsetWidth || 1;
    x -= ((speed + Math.abs(boost) * 220) * dir * (boost < -0.05 ? -1 : 1) * dt) / 1000;
    x = ((x % w) + w) % w;
    tracks.forEach((t) => gsap.set(t, { x: -x }));
    setSkew(-skew * dir);
  });
}

/** Pointer tilt + moving glare (sets --gx/--gy/--ga on the element for a CSS ::after highlight). */
export function tiltGlare(selector, { max = 8, scale = 1.015, target } = {}) {
  if (!finePointer()) return;
  $$(selector).forEach((card) => {
    if (card.dataset.tg) return;
    card.dataset.tg = '1';
    const el = target ? card.querySelector(target) || card : card;
    gsap.set(el, { transformPerspective: 1000 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
    const sc = gsap.quickTo(el, 'scale', { duration: 0.6, ease: 'power3' });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      ry((x - 0.5) * max);
      rx(-(y - 0.5) * max);
      sc(scale);
      el.style.setProperty('--gx', `${x * 100}%`);
      el.style.setProperty('--gy', `${y * 100}%`);
      el.style.setProperty('--ga', '1');
    });
    card.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
      sc(1);
      el.style.setProperty('--ga', '0');
    });
  });
}

/** Liquid hover distortion on media (SVG turbulence displacement, animated while hovered). */
let filterReady = false;
export function distortHover(selector, hostSelector) {
  if (!finePointer()) return;
  if (!filterReady) {
    filterReady = true;
    document.body.insertAdjacentHTML(
      'beforeend',
      `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><filter id="fx-liquid" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`,
    );
  }
  const disp = document.querySelector('#fx-liquid feDisplacementMap');
  const turb = document.querySelector('#fx-liquid feTurbulence');
  const state = { s: 0, f: 0.012 };
  const apply = () => {
    disp.setAttribute('scale', state.s.toFixed(2));
    turb.setAttribute('baseFrequency', `${state.f.toFixed(4)} ${(state.f * 1.6).toFixed(4)}`);
  };
  $$(hostSelector || selector).forEach((host) => {
    const media = hostSelector ? host.querySelector(selector) : host;
    if (!media) return;
    host.addEventListener('pointerenter', () => {
      media.style.filter = 'url(#fx-liquid)';
      gsap.fromTo(state, { s: 0, f: 0.02 }, { s: 38, f: 0.008, duration: 0.5, ease: 'power2.out', onUpdate: apply, yoyo: true, repeat: 1, onComplete: () => (media.style.filter = '') });
    });
  });
}

/** Cursor-following spotlight vars on sections (--sx/--sy). */
export function spotlight(selector) {
  if (!finePointer()) return;
  $$(selector).forEach((el) =>
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--sx', `${e.clientX - r.left}px`);
      el.style.setProperty('--sy', `${e.clientY - r.top}px`);
    }),
  );
}

/** Clip-path reveal on media/figures as they enter. */
export function clipReveal(selector, { from = 'inset(18% 12% 18% 12% round 24px)' } = {}) {
  if (reduceMotion) return;
  $$(selector).forEach((el) =>
    gsap.fromTo(el, { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'expo.out', duration: 1.4, clearProps: 'clipPath', scrollTrigger: { trigger: el, start: 'top 88%' } }),
  );
}

/**
 * Section colour journey: when a [data-tone] section crosses the middle of the viewport, the body background
 * tweens to its colour (sections themselves are transparent, so the change reads as one continuous canvas).
 */
export function toneJourney(selector = '[data-tone]') {
  const els = $$(selector);
  if (!els.length) return;
  const to = (c, dark) => {
    gsap.to(document.body, { backgroundColor: c, duration: reduceMotion ? 0 : 0.8, ease: 'power2.out', overwrite: 'auto' });
    document.body.classList.toggle('is-tone-dark', dark);
  };
  els.forEach((el) =>
    ScrollTrigger.create({
      trigger: el,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (s) => {
        if (s.isActive) to(el.dataset.tone, el.hasAttribute('data-tone-dark'));
      },
    }),
  );
}

/** Celebration: brand-coloured confetti burst from an element (2D canvas, removed afterwards). */
export function confetti(origin, { count = 160 } = {}) {
  if (reduceMotion) return;
  const c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '9999' });
  const dpr = Math.min(devicePixelRatio, 2);
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  document.body.append(c);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const r = origin?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const ox = r.left + r.width / 2;
  const oy = r.top + Math.min(r.height / 2, 120);
  const colors = ['#0792c2', '#293baa', '#ff5527', '#3ec4f0', '#ffd2c2', '#141a40'];
  const parts = Array.from({ length: count }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const v = 7 + Math.random() * 9;
    return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 6 + Math.random() * 6, h: 4 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[(Math.random() * colors.length) | 0], s: Math.random() < 0.3 };
  });
  const t0 = performance.now();
  const frame = (now) => {
    const t = (now - t0) / 1000;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      g.save();
      g.globalAlpha = Math.max(0, 1 - Math.max(0, t - 1.8) / 1.2);
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.scale(1, Math.cos(p.r * 2));
      g.fillStyle = p.c;
      if (p.s) {
        g.beginPath();
        g.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        g.fill();
      } else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      g.restore();
    }
    if (t < 3) requestAnimationFrame(frame);
    else c.remove();
  };
  requestAnimationFrame(frame);
}

/** Magnetic pull (translate) on elements. */
export function magnet(selector = '[data-magnetic]', strength = 0.3) {
  if (!finePointer()) return;
  $$(selector).forEach((el) => {
    if (el.dataset.mg) return;
    el.dataset.mg = '1';
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * strength);
      y((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => (x(0), y(0)));
  });
}

/** Live clock / coordinates micro-detail: fills [data-clock] with the viewer's local time, ticking. */
export function liveClock(selector = '[data-clock]') {
  const els = $$(selector);
  if (!els.length) return;
  const fmt = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tick = () => els.forEach((el) => (el.textContent = fmt()));
  tick();
  setInterval(tick, 1000);
}
