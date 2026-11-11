import { initSite, gsap, ScrollTrigger, reduceMotion, lenis } from '../../ds/site.js';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { initWorld, TONES } from './world.js';
import './home.css';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);
initSite();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mm = gsap.matchMedia();
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion;
const MOTION = '(prefers-reduced-motion: no-preference)';
const PIN = '(min-width: 901px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)';

// ---------------------------------------------------------------------------
// Scroll-driven world: per-section particle shape, anchor (desktop / mobile) and tone
// anchor = [x, y, scale, rotX, rotY, alpha] in world units (1 unit ≈ 143px at 900px tall)
// ---------------------------------------------------------------------------
const ANCHORS = {
  Hero: { d: [2.75, -0.1, 1.75, 0, -0.2, 1], m: [0, 1.55, 0.92, 0, 0, 1] },
  Specialized: { d: [0, 0.2, 2.6, 0.25, 0, 0.9], m: [0, 0.3, 1.4, 0.25, 0, 0.8] },
  Industries: { d: [0, -1.6, 2.6, 0.9, 0, 0.3], m: [0, -1.2, 1.4, 0.9, 0, 0.3] },
  'How we compare': { d: [0, -0.9, 2.6, 0.55, 0, 0.5], m: [0, -0.8, 1.4, 0.5, 0, 0.4] },
  'Growth System': { d: [2.25, -0.1, 2.3, -0.45, 0.25, 1], m: [0.7, 0.2, 1.2, -0.4, 0, 0.28] },
  "Who it's for": { d: [0, -1.3, 2.6, 0.75, 0, 0.4], m: [0, -1, 1.4, 0.7, 0, 0.35] },
  Measurement: { d: [2.65, 0, 2.6, 0.32, 0, 1], m: [0.6, 0, 1.6, 0.3, 0, 0.3] },
  Proof: { d: [2.95, -0.3, 1.9, 0.18, -0.55, 0.85], m: [0.2, 0.1, 1.3, 0.2, -0.5, 0.28] },
  'In their words': { d: [0, -1.2, 2.6, 0.6, 0, 0.4], m: [0, -1, 1.4, 0.6, 0, 0.35] },
  'How it starts': { d: [0, -1.5, 2.6, 0.85, 0, 0.35], m: [0, -1.2, 1.4, 0.8, 0, 0.3] },
  Insights: { d: [0, -1.6, 2.6, 0.95, 0, 0.3], m: [0, -1.3, 1.4, 0.9, 0, 0.3] },
  'Next step': { d: [3.05, 0.05, 1.55, 0, -0.35, 0.95], m: [0, 1.35, 0.8, 0, 0, 0.55] },
};
const secEls = $$('[data-sec]');
const sections = secEls.map((el) => {
  const name = el.dataset.sec;
  const a = ANCHORS[name] || ANCHORS.Insights;
  return { el, name, shape: el.dataset.shape, tone: el.dataset.tone, d: a.d, m: a.m };
});

const FILM_COLORS = {
  hvac: ['#0b2a4a', '#0792c2', '#ff8a5c'],
  plumbing: ['#04192e', '#0a8fc0', '#9be7ff'],
  electrical: ['#0d1033', '#293baa', '#ffb347'],
  roofing: ['#1a1430', '#46388a', '#ff5527'],
  cleaning: ['#8fcbe4', '#e9f7fd', '#0792c2'],
};
const films = $$('[data-film]').map((el) => ({ el, link: el.closest('a'), colors: FILM_COLORS[el.dataset.film] }));

const readoutFps = $('[data-readout-fps]');
let lastTone = '';
let world = null;
const worldReady = initWorld({
  host: $('[data-world]'),
  sections,
  films,
  reduce: reduceMotion,
  onStats: {
    fps: (fps, n) => readoutFps && (readoutFps.textContent = `${fps} fps · ${(n / 1000).toFixed(0)}k pts`),
    tone: (c) => {
      if (c === lastTone) return;
      lastTone = c;
      document.body.style.backgroundColor = c;
    },
  },
})
  .then((w) => {
    world = w;
    if (w) $$('[data-pts]').forEach((e) => (e.textContent = w.count.toLocaleString('en-US')));
    return w;
  })
  .catch((err) => {
    console.warn('[home world]', err);
    return null;
  });

// Without WebGL the body still gets the section tones (CSS fallback)
ScrollTrigger.create({
  trigger: document.body,
  start: 0,
  end: 'max',
  onUpdate: () => {
    if (world) return;
    const probe = innerHeight * 0.5;
    const s = sections.find((x) => {
      const r = x.el.getBoundingClientRect();
      return r.top <= probe && r.bottom > probe;
    });
    if (s) document.body.style.backgroundColor = TONES[s.tone];
  },
});
document.body.style.backgroundColor = TONES.dark;

// ---------------------------------------------------------------------------
// HUD: section rail + readout
// ---------------------------------------------------------------------------
const rail = $('[data-rail]');
const readIdx = $('[data-readout-index]');
const readName = $('[data-readout-name]');
rail.innerHTML = secEls.map((s, i) => `<span class="h-rail__tick" data-i="${i}"><b>${String(i + 1).padStart(2, '0')}</b><em>${s.dataset.sec}</em></span>`).join('');
const ticks = $$('.h-rail__tick', rail);
const setSection = (i) => {
  ticks.forEach((t, k) => t.classList.toggle('is-on', k === i));
  readIdx.textContent = `${String(i + 1).padStart(2, '0')} / ${String(secEls.length).padStart(2, '0')}`;
  readName.textContent = secEls[i].dataset.sec;
  document.documentElement.dataset.tone = secEls[i].dataset.tone;
};
secEls.forEach((el, i) =>
  ScrollTrigger.create({ trigger: el, start: 'top 50%', end: 'bottom 50%', onToggle: (self) => self.isActive && setSection(i) }),
);
setSection(0);

// ---------------------------------------------------------------------------
// Headings: kinetic hero (chars, 3D rotateX) + masked line reveals elsewhere
// ---------------------------------------------------------------------------
mm.add(MOTION, () => {
  const run = () => {
    const title = $('[data-kinetic]');
    SplitText.create(title, {
      type: 'words,chars',
      wordsClass: 'kw',
      charsClass: 'kc',
      aria: 'auto',
      autoSplit: true,
      onSplit(self) {
        gsap.set(self.chars, { transformPerspective: 700, transformOrigin: '50% 100% -30px' });
        const intro = gsap.from(self.chars, {
          rotationX: -100,
          yPercent: 70,
          opacity: 0,
          duration: 1.3,
          ease: 'expo.out',
          stagger: { each: 0.016, from: 'start' },
          delay: 0.2,
        });
        // scroll-out: words lift away at different speeds
        const out = gsap.to(self.words, {
          y: (i) => -40 - ((i * 37) % 90),
          rotationX: 28,
          opacity: 0.1,
          ease: 'none',
          stagger: 0.02,
          scrollTrigger: { trigger: '.h-hero', start: 'top top', end: 'bottom 20%', scrub: true },
        });
        // pointer proximity: letters rise toward the cursor
        let onMove;
        if (fine) {
          const sets = self.chars.map((c) => gsap.quickTo(c, 'y', { duration: 0.6, ease: 'power3' }));
          onMove = (e) => {
            self.chars.forEach((c, i) => {
              const r = c.getBoundingClientRect();
              const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
              const d = Math.hypot(dx, dy);
              sets[i](d < 160 ? -(1 - d / 160) * 14 : 0);
            });
          };
          title.addEventListener('pointermove', onMove);
          title.addEventListener('pointerleave', () => sets.forEach((s) => s(0)));
        }
        return gsap.timeline().add(intro).add(out, 0);
      },
    });
    $$('[data-split]').forEach((el) =>
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        aria: 'auto',
        onSplit: (self) =>
          gsap.from(self.lines, { yPercent: 110, duration: 1.1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }),
      }),
    );
    gsap.from('[data-hero-item]', { y: 24, opacity: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out', delay: 0.55 });
    gsap.from('.h-hero__meta > *, .h-scrollcue', { opacity: 0, y: -8, duration: 0.8, stagger: 0.08, delay: 0.9 });
    gsap.from('.h-chip, .h-coord, .h-cross', { opacity: 0, scale: 0.8, duration: 1, ease: 'back.out(1.6)', stagger: 0.1, delay: 1.1 });
    gsap.to('.h-chip--a', { y: -12, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.h-chip--b', { y: 12, duration: 3.1, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.h-hero__foot', { y: -60, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.h-hero', start: '30% top', end: 'bottom top', scrub: true } });
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  };
  document.fonts ? document.fonts.ready.then(run) : run();
});

// Hero coordinates readout follows the pointer
const coord = $('.h-coord--a');
if (fine && coord)
  addEventListener(
    'pointermove',
    (e) => {
      if (scrollY > innerHeight) return;
      coord.textContent = `x ${(e.clientX / innerWidth).toFixed(2)} · y ${(e.clientY / innerHeight).toFixed(2)}`;
    },
    { passive: true },
  );
// Tap/click on the hero bursts the particles
$('.h-hero').addEventListener('pointerdown', (e) => {
  if (!e.target.closest('a, button')) world?.burst(0.7);
});

// ---------------------------------------------------------------------------
// 02 · Marquee reacting to scroll velocity (direction follows the scroll)
// ---------------------------------------------------------------------------
const rows = $$('[data-marquee-row]');
rows.forEach((row) => {
  const set = $('.h-marquee__set', row);
  // three aria-hidden clones so the strip is seamless at any width
  for (let i = 0; i < 3; i++) {
    const c = set.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    c.removeAttribute('role');
    $$('li', c).forEach((li) => li.setAttribute('role', 'presentation'));
    row.append(c);
  }
});
if (!reduceMotion) {
  const state = rows.map(() => ({ x: 0 }));
  let dir = 1;
  gsap.ticker.add((_t, dtMs) => {
    const v = lenis ? lenis.velocity : 0;
    if (Math.abs(v) > 0.2) dir = Math.sign(v);
    rows.forEach((row, i) => {
      const w = row.firstElementChild.offsetWidth;
      if (!w) return;
      const base = (i ? -1 : 1) * dir * 50;
      state[i].x -= (base + v * 14 * (i ? -1 : 1)) * (dtMs / 1000);
      state[i].x = gsap.utils.wrap(-w, 0, state[i].x);
      row.style.transform = `translate3d(${state[i].x}px,0,0)`;
    });
  });
}

// ---------------------------------------------------------------------------
// 03 · Before/after split: a scan beam passes the rows as you scroll
// ---------------------------------------------------------------------------
const scan = $('[data-scan]');
const scanRows = $$('tbody tr', scan);
const beam = $('[data-scan-beam]');
const setScan = (p) => {
  const n = p * scanRows.length;
  scanRows.forEach((r, i) => r.classList.toggle('is-scanned', i < n));
  const last = scanRows[Math.max(0, Math.min(scanRows.length - 1, Math.floor(n)))];
  if (last) beam.style.transform = `translateY(${last.offsetTop + (n >= scanRows.length ? last.offsetHeight : 0)}px)`;
  scan.classList.toggle('is-done', n >= scanRows.length);
};
if (reduceMotion) setScan(1);
else ScrollTrigger.create({ trigger: scan, start: 'top 70%', end: 'bottom 55%', scrub: true, onUpdate: (s) => setScan(s.progress) });

// ---------------------------------------------------------------------------
// 04 · Growth loop: pinned, the particle loop lights stage by stage
// ---------------------------------------------------------------------------
const stages = $$('.h-stage');
const big = $('[data-stage-big]');
const label = $('[data-stage-label]');
const num = $('[data-stage-num]');
const ring = $('[data-ring]');
let stageNow = -1;
const setStage = (i, p) => {
  if (p !== undefined) ring.style.strokeDashoffset = String(1 - p);
  if (i === stageNow) return;
  stageNow = i;
  stages.forEach((s, k) => {
    s.classList.toggle('is-active', k === i);
    s.classList.toggle('is-done', k < i);
  });
  const name = $('.t-label-md', stages[i]).textContent;
  num.textContent = i + 1;
  worldReady.then((w) => w?.setNode(stageNow));
  if (reduceMotion) {
    big.textContent = String(i + 1).padStart(2, '0');
    label.textContent = name;
    return;
  }
  gsap.to(big, { duration: 0.6, scrambleText: { text: String(i + 1).padStart(2, '0'), chars: '0123456789', speed: 0.6 }, ease: 'none', overwrite: true });
  gsap.fromTo(label, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out', overwrite: true, onStart: () => (label.textContent = name) });
};
setStage(0, 1 / 7);
mm.add(PIN, () => {
  const st = ScrollTrigger.create({
    trigger: '.h-growth',
    pin: '[data-growth-pin]',
    start: 'top top',
    end: () => `+=${Math.round(innerHeight * 2.6)}`,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (s) => setStage(Math.min(6, Math.floor(s.progress * 7)), Math.max(1 / 7, s.progress)),
  });
  return () => st.kill();
});
mm.add('(max-width: 900px), (max-height: 599px)', () => {
  if (reduceMotion) return;
  const st = ScrollTrigger.create({
    trigger: '[data-loop]',
    start: 'top 70%',
    end: 'bottom 40%',
    onUpdate: (s) => setStage(Math.min(6, Math.floor(s.progress * 7)), Math.max(1 / 7, s.progress)),
  });
  return () => st.kill();
});
if (reduceMotion) stages.forEach((s) => s.classList.add('is-done'));
mm.add(MOTION, () => {
  gsap.from(stages, { x: -24, opacity: 0, stagger: 0.06, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: '[data-loop]', start: 'top 85%' } });
});

// ---------------------------------------------------------------------------
// 05 · Fit cards: tilt with glare
// ---------------------------------------------------------------------------
if (fine)
  $$('[data-tilt-glare]').forEach((card) => {
    gsap.set(card, { transformPerspective: 1000 });
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3' });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * 8);
      rx(-(py - 0.5) * 8);
      card.style.setProperty('--gx', `${px * 100}%`);
      card.style.setProperty('--gy', `${py * 100}%`);
    });
    card.addEventListener('pointerleave', () => (rx(0), ry(0)));
  });

// ---------------------------------------------------------------------------
// 06 · Industries: pinned horizontal gallery (native swipe on phones / reduced motion)
// ---------------------------------------------------------------------------
const indTrack = $('[data-ind-track]');
const indProg = $('[data-ind-progress]');
const indCount = $('[data-ind-count]');
const filmEls = $$('.h-film');
const setInd = (p) => {
  indProg.style.transform = `scaleX(${Math.max(0.2, p)})`;
  indCount.textContent = String(Math.min(5, Math.floor(p * 4.999) + 1)).padStart(2, '0');
};
mm.add(PIN, () => {
  const sec = $('.h-ind');
  sec.classList.add('is-h');
  const dist = () => Math.max(0, indTrack.scrollWidth - innerWidth + 72);
  const tw = gsap.to(indTrack, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: sec,
      pin: '[data-ind-pin]',
      start: 'top top',
      end: () => `+=${dist()}`,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (s) => setInd(s.progress),
    },
  });
  // cards drift in depth as they cross the screen
  const drift = filmEls.map((f, i) =>
    gsap.fromTo(
      f,
      { yPercent: i % 2 ? 6 : -4 },
      { yPercent: i % 2 ? -6 : 4, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${dist()}`, scrub: true } },
    ),
  );
  return () => {
    sec.classList.remove('is-h');
    tw.scrollTrigger?.kill();
    tw.kill();
    drift.forEach((d) => (d.scrollTrigger?.kill(), d.kill()));
    gsap.set(indTrack, { clearProps: 'transform' });
  };
});
indTrack.addEventListener('scroll', () => setInd(indTrack.scrollLeft / Math.max(1, indTrack.scrollWidth - indTrack.clientWidth)), { passive: true });

// ---------------------------------------------------------------------------
// 07 · Funnel rows drive the particle funnel's highlighted level
// ---------------------------------------------------------------------------
const fRows = $$('[data-funnel] li');
const lvN = $('[data-level-n]');
const lvName = $('[data-level-name]');
const setLevel = (i) => {
  fRows.forEach((r, k) => r.classList.toggle('is-active', k === i));
  lvN.textContent = String(i + 1).padStart(2, '0');
  lvName.textContent = $('.t-label-md', fRows[i]).textContent;
  world?.setLevel(i);
};
fRows.forEach((row, i) => {
  ScrollTrigger.create({ trigger: row, start: 'top 58%', end: 'bottom 58%', onToggle: (s) => s.isActive && setLevel(i) });
  row.addEventListener('pointerenter', () => setLevel(i));
});
mm.add(MOTION, () => {
  gsap.from(fRows, { x: -30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '[data-funnel]', start: 'top 82%' } });
  gsap.from('.h-funnel__bar', { scaleX: 0, duration: 1.4, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: '[data-funnel]', start: 'top 75%' } });
});

// ---------------------------------------------------------------------------
// 08 · Proof: giant values scramble in; hovering a metric lights its bar
// ---------------------------------------------------------------------------
$$('[data-scramble]').forEach((el, i) => {
  if (reduceMotion) return;
  const text = el.textContent;
  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => gsap.to(el, { duration: 1.4, delay: i * 0.12, scrambleText: { text, chars: '0123456789%$X', revealDelay: 0.4, speed: 0.5 } }),
  });
});
$$('.h-metric').forEach((m) => {
  m.addEventListener('pointerenter', () => world?.setBar(Number(m.dataset.bar)));
  m.addEventListener('pointerleave', () => world?.setBar(-1));
});
mm.add(MOTION, () => {
  gsap.from('.h-metric', { y: 60, opacity: 0, rotationX: -20, transformPerspective: 900, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '[data-metrics]', start: 'top 85%' } });
});

// ---------------------------------------------------------------------------
// 09 · Testimonials: the 3D card stack features a quote (crossfade + word reveal)
// ---------------------------------------------------------------------------
const featured = $('.h-quote');
const cards = $$('.h-card');
cards.forEach((card) => {
  card.setAttribute('aria-pressed', 'false');
  card.addEventListener('click', () => {
    const data = JSON.parse(card.dataset.quote);
    cards.forEach((c) => c.setAttribute('aria-pressed', String(c === card)));
    const swap = () => {
      $('[data-quote-text]', featured).textContent = data.text;
      $('[data-quote-name]', featured).textContent = data.name;
      $('[data-quote-role]', featured).textContent = data.role;
    };
    if (reduceMotion) return swap();
    const parts = [$('[data-quote-text]', featured), $('.h-quote__author', featured)];
    gsap
      .timeline()
      .to(parts, { opacity: 0, y: -10, duration: 0.2, stagger: 0.03 })
      .add(swap)
      .set(parts, { opacity: 1, y: 0 })
      .add(() => {
        const s = SplitText.create(parts[0], { type: 'words', aria: 'auto' });
        gsap.from(s.words, { opacity: 0, y: 14, rotationX: -50, duration: 0.6, stagger: 0.025, ease: 'expo.out', onComplete: () => s.revert() });
      })
      .from(parts[1], { opacity: 0, y: 8, duration: 0.4 }, '<0.2');
    gsap.fromTo('.h-quote__mark', { scale: 0.6, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
  });
});

// ---------------------------------------------------------------------------
// 10 · How it starts: pinned camera move (desktop) / stepper (mobile)
// ---------------------------------------------------------------------------
const timeline = $('[data-timeline]');
const nodes = $$('.timeline__node', timeline);
const fills = $$('.timeline__fill', timeline);
const steps = $$('.timeline__step', timeline);
const prev = $('[data-prev]', timeline);
const next = $('[data-next]', timeline);
const counter = $('[data-current]', timeline);
let current = 0;
const render = (i) => {
  current = i;
  nodes.forEach((n, k) => n.classList.toggle('is-active', k <= i));
  fills.forEach((f, k) => gsap.to(f, { scaleX: k < i ? 1 : 0, duration: reduceMotion ? 0 : 0.6, ease: 'power2.out' }));
  steps.forEach((s, k) => s.classList.toggle('is-current', k === i));
  counter.textContent = i + 1;
  prev.disabled = i === 0;
  next.disabled = i === steps.length - 1;
};
prev.addEventListener('click', () => render(Math.max(0, current - 1)));
next.addEventListener('click', () => render(Math.min(steps.length - 1, current + 1)));
render(0);

mm.add(PIN, () => {
  const sec = $('.h-starts');
  sec.classList.add('is-cam');
  const stepsRow = $('[data-steps]');
  const st = ScrollTrigger.create({
    trigger: sec,
    pin: '[data-starts-pin]',
    start: 'top top',
    end: () => `+=${Math.round(innerHeight * 1.6)}`,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const p = self.progress * (nodes.length - 1);
      fills.forEach((f, k) => gsap.set(f, { scaleX: gsap.utils.clamp(0, 1, p - k) }));
      nodes.forEach((n, k) => n.classList.toggle('is-active', p >= k - 0.02));
      const cur = Math.round(p);
      steps.forEach((s, k) => {
        const d = k - p;
        gsap.set(s, { z: -Math.abs(d) * 260, rotationY: gsap.utils.clamp(-40, 40, -d * 26), opacity: 1 - Math.min(0.7, Math.abs(d) * 0.55) });
        s.classList.toggle('is-current', k === cur);
      });
      const w = steps[0].offsetWidth + 32;
      gsap.set(stepsRow, { x: -p * w });
    },
  });
  return () => {
    st.kill();
    sec.classList.remove('is-cam');
    gsap.set([stepsRow, ...steps], { clearProps: 'transform,opacity' });
    render(current);
  };
});

// ---------------------------------------------------------------------------
// 12 · Closing: giant outline text slides with scroll
// ---------------------------------------------------------------------------
mm.add(MOTION, () => {
  gsap.fromTo('[data-closing-giant]', { xPercent: 10 }, { xPercent: -25, ease: 'none', scrollTrigger: { trigger: '.h-closing', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.h-post__media, .h-row__thumb', { clipPath: 'inset(0 100% 0 0 round 16px)', duration: 1.3, ease: 'expo.inOut', stagger: 0.1, scrollTrigger: { trigger: '.h-res__row', start: 'top 80%' } });
});

// ---------------------------------------------------------------------------
// Magnetic CTAs (fine pointers only) — uses the CSS translate property
// ---------------------------------------------------------------------------
if (fine)
  $$('main .btn').forEach((btn) => {
    btn.dataset.magnetic = '';
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.translate = `${(e.clientX - (r.left + r.width / 2)) * 0.25}px ${(e.clientY - (r.top + r.height / 2)) * 0.35}px`;
    });
    btn.addEventListener('pointerleave', () => (btn.style.translate = '0 0'));
  });

// triggers were created out of document order (pins first): sort before measuring
ScrollTrigger.sort();
ScrollTrigger.refresh();
addEventListener('load', () => {
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  world?.refresh();
});
