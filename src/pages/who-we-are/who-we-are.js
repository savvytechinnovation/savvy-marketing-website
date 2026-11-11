import { initSite, gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';
import { Flip } from 'gsap/Flip';
import { autoMount3D } from '../../ds/fx3d.js';
import { $, $$, SplitText, splitHeadings, magnetic, tilt } from '../careers/motion.js';
import { stage, particles, paintCovers } from '../resources/gl-kit.js';
import { chars3D, liveClock } from '../resources/fx-dom.js';
import './who-we-are.css';

gsap.registerPlugin(Flip);
initSite();
autoMount3D();
magnetic();
tilt('[data-tilt]', 4);

const mm = gsap.matchMedia();

// Headings (masked line reveal) + hero entrance
mm.add('(prefers-reduced-motion: no-preference)', () => splitHeadings({ heroMedia: '[data-hero-media]' }));

// ---------------------------------------------------------------------------
// 03 Vision: the statement lights up word by word as the section scrolls through
// ---------------------------------------------------------------------------
const vision = $('[data-vision]');
const fill = $('[data-vision-fill]');
mm.add('(prefers-reduced-motion: no-preference)', () => {
  const split = SplitText.create('[data-vision-text]', { type: 'words', aria: 'auto' });
  gsap.set(split.words, { opacity: 0.18 });
  gsap.set(fill, { scaleX: 0 });
  const desktop = matchMedia('(min-width: 901px)').matches;
  // Desktop: pin the band while the statement is "read" (scroll storytelling); mobile: plain scrub
  const tl = gsap.timeline({
    scrollTrigger: desktop
      ? { trigger: vision, start: 'top top+=10%', end: '+=90%', pin: true, scrub: 0.6 }
      : { trigger: vision, start: 'top 75%', end: 'bottom 45%', scrub: 0.6 },
  });
  tl.to(split.words, { opacity: 1, stagger: 0.1, ease: 'none', duration: 0.4 }, 0).to(fill, { scaleX: 1, ease: 'none', duration: tl.duration() || 2.5 }, 0);
  return () => split.revert();
});
mm.add('(prefers-reduced-motion: reduce)', () => gsap.set(fill, { scaleX: 1 }));

// ---------------------------------------------------------------------------
// 04 Founders: "Read the full story" / voice-note transcript disclosures + photo parallax
// ---------------------------------------------------------------------------
$$('.founder__toggle, .founder__voice').forEach((btn) => {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
      panel.hidden = false;
      if (!reduceMotion) gsap.from(panel, { height: 0, opacity: 0, duration: 0.45, ease: 'power3.out', clearProps: 'height,opacity' });
    } else if (reduceMotion) panel.hidden = true;
    else gsap.to(panel, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => ((panel.hidden = true), gsap.set(panel, { clearProps: 'all' })) });
    setTimeout(() => ScrollTrigger.refresh(), 500);
  });
});
mm.add('(prefers-reduced-motion: no-preference) and (min-width: 901px)', () => {
  $$('[data-parallax]').forEach((el) =>
    gsap.fromTo(el, { y: 40 }, { y: -40, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } }),
  );
});

// ---------------------------------------------------------------------------
// 05 Team: filter by industry (Flip layout animation). "All industries" members always match.
// ---------------------------------------------------------------------------
const teamFilter = $('[data-team-filter]');
const grid = $('[data-team-grid]');
const status = $('[data-team-status]');
if (teamFilter && grid) {
  const members = $$('.member', grid);
  teamFilter.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-industry]');
    if (!chip || chip.getAttribute('aria-pressed') === 'true') return;
    $$('[data-industry]', teamFilter).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    const key = chip.dataset.industry;
    const state = reduceMotion || ringOn ? null : Flip.getState(members);
    let shown = 0;
    members.forEach((m) => {
      const tags = m.dataset.industries.split(' ');
      const match = key === 'all' || tags.includes(key) || tags.includes('all');
      m.hidden = !match;
      shown += match;
    });
    status.textContent = `${shown} team members ${key === 'all' ? 'in total' : `work with ${chip.textContent} businesses`}`;
    if (state)
      Flip.from(state, {
        duration: 0.6,
        ease: 'power3.inOut',
        absolute: true,
        scale: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.3 }),
        onComplete: () => ScrollTrigger.refresh(),
      });
    else if (ringOn) layoutRing(true);
    else ScrollTrigger.refresh();
  });
}

// ---------------------------------------------------------------------------
// 06 Future: the number of the item in view lights up
// ---------------------------------------------------------------------------
if (!reduceMotion)
  $$('.future-item').forEach((item) =>
    ScrollTrigger.create({ trigger: item, start: 'top 70%', end: 'bottom 30%', toggleClass: 'is-lit' }),
  );

// ---------------------------------------------------------------------------
// 08 Proof: testimonial pager (buttons, arrow keys, swipe)
// ---------------------------------------------------------------------------
const pager = $('[data-quotes]');
if (pager) {
  const slides = $$('[data-slide]', pager);
  const count = $('[data-quote-count]', pager);
  let i = 0;
  const show = (n) => {
    const next = (n + slides.length) % slides.length;
    if (next === i) return;
    const from = slides[i];
    const to = slides[next];
    i = next;
    count.textContent = `${i + 1} / ${slides.length}`;
    from.hidden = true;
    to.hidden = false;
    if (!reduceMotion) gsap.from(to.children, { opacity: 0, y: 10, duration: 0.5, stagger: 0.06, ease: 'expo.out' });
  };
  $('[data-quote-prev]', pager).addEventListener('click', () => show(i - 1));
  $('[data-quote-next]', pager).addEventListener('click', () => show(i + 1));
  pager.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
  let x0 = null;
  pager.addEventListener('pointerdown', (e) => (x0 = e.clientX));
  pager.addEventListener('pointerup', (e) => {
    if (x0 !== null && Math.abs(e.clientX - x0) > 40) show(i + (e.clientX < x0 ? 1 : -1));
    x0 = null;
  });
}

// ---------------------------------------------------------------------------
// 09 Closing: next steps light up one after another when the section enters view
// ---------------------------------------------------------------------------
const steps = $$('[data-steps] li');
if (steps.length && !reduceMotion) {
  let timer;
  const cycle = () => {
    let k = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      k = (k + 1) % steps.length;
      steps.forEach((s, j) => s.classList.toggle('is-active', j === k));
    }, 1600);
  };
  ScrollTrigger.create({ trigger: '[data-steps]', start: 'top 90%', end: 'bottom top', onToggle: (self) => (self.isActive ? cycle() : clearInterval(timer)) });
}

// ===========================================================================
// Round 2 — sticky particle stage (hero → 4 chapters) and the 3D team ring
// ===========================================================================
const stageEl = $('[data-stage]');
const stageLabel = $('[data-stage-label]');
const stageBar = $('[data-stage-bar]');
const LABELS = ['00 · Savvy Post', '00 · Savvy Post', '01 · Strategy', '02 · Systems', '03 · Measurement', '04 · Five industries'];
const wide = () => innerWidth > 900;
// particles sit opposite the copy: hero copy left → shape right; chapters alternate
const SIDE = [0, 2.6, 2.8, -2.8, 2.8, -2.8];

stage(
  $('[data-particles]'),
  particles(['scatter', 'logo', 'sphere', 'grid', 'bars', 'clusters'], {
    count: 6500,
    mobileScale: 0.62,
    mobileY: 1.2,
    onUpdate: (t, c, { group, camera }) => {
      const k = Math.round(c.values.shape);
      const tx = wide() ? SIDE[k] ?? 0 : 0;
      group.position.x += (tx - group.position.x) * 0.04;
      camera.position.z = 11 - c.progress * 2.2;
      c.values.spin = c.progress * Math.PI * 1.5;
    },
  }),
  {
    eager: true,
    scrub: true,
    trigger: stageEl,
    start: 'top top',
    end: 'bottom bottom',
    stillTime: 3,
    onReady: (api) => {
      api.set('shape', reduceMotion ? 1 : 0);
      if (!reduceMotion) setTimeout(() => api.set('shape', 1), 350);
      else api.redraw();
      $$('[data-chapter]').forEach((el) =>
        ScrollTrigger.create({
          trigger: el,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (st) => {
            if (!st.isActive) return;
            const n = Number(el.dataset.chapter);
            api.set('shape', n);
            api.set('burst', 0.6);
            setTimeout(() => api.set('burst', 0), 500);
            stageLabel.textContent = LABELS[n];
          },
        }),
      );
    },
  },
);
ScrollTrigger.create({ trigger: stageEl, start: 'top top', end: 'bottom bottom', onUpdate: (st) => (stageBar.style.transform = `scaleX(${st.progress})`) });
chars3D($('[data-chars]'), { delay: 0.3 });
liveClock();
paintCovers();

mm.add('(prefers-reduced-motion: no-preference)', () => {
  $$('.wwa-chapter').forEach((ch) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: ch, start: 'top 80%', end: 'bottom 20%', scrub: 0.5 } });
    tl.fromTo(ch.children, { y: 80, opacity: 0, rotationX: -25, transformPerspective: 800 }, { y: 0, opacity: 1, rotationX: 0, stagger: 0.08, duration: 0.4 })
      .to(ch.children, { y: -60, opacity: 0, stagger: 0.05, duration: 0.3 }, 0.75);
  });
});

// ---------------------------------------------------------------------------
// 05 Team: 3D ring carousel (desktop, motion on). Filtering re-lays the ring.
// ---------------------------------------------------------------------------
const ringEl = $('[data-ring]');
const ringNav = $('[data-ring-nav]');
const ringCount = $('[data-ring-count]');
let ringOn = false;
const ringState = { rot: 0 };
let step = 0;
const visibleMembers = () => $$('.member', grid).filter((m) => !m.hidden);

function layoutRing(animate = true) {
  if (!ringOn) return;
  const ms = visibleMembers();
  const n = ms.length;
  const radius = Math.max(340, (260 + 40) / (2 * Math.tan(Math.PI / Math.max(n, 3))));
  ms.forEach((m, i) => {
    m.style.transform = `rotateY(${(360 / n) * i}deg) translateZ(${radius}px)`;
    if (animate) gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: i * 0.04 });
  });
  grid.style.setProperty('--r', `${radius}px`);
  goTo(Math.min(step, n - 1), animate);
}

function goTo(i, animate = true) {
  const ms = visibleMembers();
  const n = ms.length || 1;
  step = i;
  const target = -(360 / n) * i;
  gsap.to(ringState, {
    rot: target,
    duration: animate ? 0.9 : 0,
    ease: 'expo.out',
    onUpdate: () => applyRot(),
  });
  const front = ((i % n) + n) % n;
  ms.forEach((m, k) => m.classList.toggle('is-front', k === front));
  ringCount.textContent = `${String(front + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
}
const applyRot = () => (grid.style.transform = `translateZ(${-parseFloat(grid.style.getPropertyValue('--r') || 0)}px) rotateY(${ringState.rot}deg)`);

function enableRing(on) {
  ringOn = on;
  ringEl.classList.toggle('is-ring', on);
  ringNav.hidden = !on;
  if (on) layoutRing(false);
  else {
    grid.style.transform = '';
    $$('.member', grid).forEach((m) => ((m.style.transform = ''), m.classList.remove('is-front')));
  }
}

if (ringEl && grid) {
  $('[data-ring-prev]').addEventListener('click', () => goTo(step - 1));
  $('[data-ring-next]').addEventListener('click', () => goTo(step + 1));
  ringEl.addEventListener('keydown', (e) => {
    if (!ringOn) return;
    if (e.key === 'ArrowLeft') goTo(step - 1);
    if (e.key === 'ArrowRight') goTo(step + 1);
  });
  // drag to spin (snaps to the nearest card)
  let x0 = null;
  let r0 = 0;
  ringEl.addEventListener('pointerdown', (e) => {
    if (!ringOn || e.target.closest('button')) return;
    x0 = e.clientX;
    r0 = ringState.rot;
    gsap.killTweensOf(ringState);
  });
  addEventListener('pointermove', (e) => {
    if (x0 === null) return;
    ringState.rot = r0 + (e.clientX - x0) * 0.25;
    applyRot();
  });
  addEventListener('pointerup', () => {
    if (x0 === null) return;
    x0 = null;
    const n = visibleMembers().length || 1;
    goTo(Math.round(-ringState.rot / (360 / n)));
  });
  mm.add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)', () => {
    enableRing(true);
    // slow idle drift while the section is on screen
    const idle = setInterval(() => ringOn && !ringEl.matches(':hover') && document.visibilityState === 'visible' && ScrollTrigger.isInViewport(ringEl) && goTo(step + 1), 3800);
    return () => (clearInterval(idle), enableRing(false));
  });
}
