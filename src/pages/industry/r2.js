// Round 2 · motion layer shared by the Industries hub + industry pages (and reused by Results / case pages):
// tone backdrop (section colour transitions), scroll-velocity marquee, section indices, HUD readouts, scramble
// numbers, scroll-lit strips. Everything degrades to the static page under prefers-reduced-motion.
import { gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrambleTextPlugin);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Section colour transitions: a fixed backdrop whose colour follows the dark sections in view. */
export function initTone() {
  const sections = $$('[data-tone="dark"]');
  if (!sections.length || reduceMotion) return;
  const root = document.documentElement;
  root.classList.add('tone-fx');
  const bg = document.createElement('div');
  bg.className = 'tone-bg';
  bg.setAttribute('aria-hidden', 'true');
  document.body.prepend(bg);
  let last = -1;
  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = innerHeight;
    let tone = 0;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      const enter = clamp01((vh * 0.9 - r.top) / (vh * 0.3));
      const exit = clamp01((r.bottom - vh * 0.12) / (vh * 0.3));
      tone = Math.max(tone, Math.min(enter, exit));
    }
    if (Math.abs(tone - last) > 0.002) {
      last = tone;
      root.style.setProperty('--tone', tone.toFixed(3));
    }
  };
  const queue = () => (raf ||= requestAnimationFrame(update));
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  update();
}

/** Giant outlined marquee: drifts on its own, speeds up / skews / flips direction with scroll velocity. */
export function initVMarquee() {
  const bands = $$('[data-vmarq]');
  if (!bands.length || reduceMotion) return;
  let vel = 0;
  let dir = 1;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      vel = self.getVelocity();
      if (Math.abs(vel) > 30) dir = vel > 0 ? 1 : -1;
    },
  });
  bands.forEach((band) => {
    const track = $('.vmarq__track', band);
    const set = $('.vmarq__set', band);
    let x = 0;
    let visible = false;
    let skew = 0;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(band);
    gsap.ticker.add((t, dtMs) => {
      if (!visible) return;
      const dt = Math.min(0.05, dtMs / 1000);
      const w = set.offsetWidth || 1;
      const speed = 60 + Math.min(2400, Math.abs(vel)) * 0.45;
      x -= dir * speed * dt;
      x = ((x % w) - w) % w;
      vel *= 0.92;
      skew += (Math.max(-14, Math.min(14, -vel * 0.006)) - skew) * 0.12;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    });
  });
}

/** Section indices: line draws in, number scrambles. */
export function initSecIndex() {
  if (reduceMotion) return;
  $$('.sec-index').forEach((el) => {
    const n = $('.sec-index__n', el);
    const line = $('.sec-index__line', el);
    gsap.set(line, { scaleX: 0 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(line, { scaleX: 1, duration: 1.4, ease: 'expo.out' });
        gsap.to(n, { duration: 0.9, scrambleText: { text: n.textContent, chars: '0123456789', speed: 0.6 } });
      },
    });
  });
}

/** Scramble text (numbers / placeholders) into place the first time it scrolls in. */
export function scrambleOnEnter(selector, { chars = '0123456789$%+[]', duration = 1.4 } = {}) {
  if (reduceMotion) return;
  $$(selector).forEach((el) => {
    const text = el.textContent;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(el, { duration, scrambleText: { text, chars, revealDelay: duration * 0.35, speed: 0.5 } }),
    });
  });
}

/** Stage strip: stages light in order as the strip crosses the viewport. */
export function initStripStory() {
  const strip = $('[data-strip]');
  if (!strip || reduceMotion) return;
  const stages = $$('.strip__stage', strip);
  ScrollTrigger.create({
    trigger: strip,
    start: 'top 85%',
    end: 'top 35%',
    scrub: true,
    onUpdate: (self) =>
      stages.forEach((s, i) => {
        const f = clamp01(self.progress * stages.length - i);
        s.style.setProperty('--fill', f.toFixed(3));
        s.classList.toggle('is-lit', f > 0.5);
      }),
  });
}

/**
 * Hero: two-act scroll journey for the sticky WebGL stage + HUD details (pointer coordinates, drifting readouts).
 * `scene` is the promise from mountIndustryScene / a compatible API with setScroll(p).
 */
export function initHeroStage(hero, scenePromise) {
  if (!hero) return;
  let scene = null;
  scenePromise?.then((s) => {
    scene = s;
    scene?.setScroll(lastP);
  });
  let lastP = 0;
  const act = $('[data-hud-act]', hero);
  const setP = (p) => {
    lastP = p;
    hero.style.setProperty('--act', p.toFixed(3));
    if (act) act.textContent = p > 0.45 ? '02' : '01';
    scene?.setScroll(p);
  };
  if (!reduceMotion) {
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom bottom', onUpdate: (self) => setP(self.progress) });
    gsap.to($('.ind-hero__act--1 .ind-hero__copy', hero), { yPercent: -18, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '45% top', scrub: true } });
    gsap.from($$('.ind-hero__act--2 > *', hero), { y: 80, opacity: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: $('.ind-hero__act--2', hero), start: 'top 75%' } });
  }
  // pointer coordinates
  const xEl = $('[data-hud-x]', hero);
  const yEl = $('[data-hud-y]', hero);
  if (xEl && matchMedia('(pointer: fine)').matches) {
    let raf = 0;
    let ex = 0;
    let ey = 0;
    hero.addEventListener('pointermove', (e) => {
      ex = (e.clientX / innerWidth) * 2 - 1;
      ey = -((e.clientY / innerHeight) * 2 - 1);
      raf ||= requestAnimationFrame(() => {
        raf = 0;
        const f = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(3)}`;
        xEl.textContent = f(ex);
        yEl.textContent = f(ey);
      });
    });
  }
  // drifting readouts
  if (!reduceMotion) {
    const nums = $$('[data-hud-num]', hero).map((el) => ({ el, base: Number(el.dataset.hudNum), dec: (el.dataset.hudNum.split('.')[1] || '').length }));
    if (nums.length)
      setInterval(() => {
        if (document.hidden || hero.getBoundingClientRect().bottom < 0) return;
        nums.forEach(({ el, base, dec }) => (el.textContent = (base * (1 + (Math.random() - 0.5) * 0.04)).toFixed(dec)));
      }, 1400);
  }
}
