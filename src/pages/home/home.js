import { initSite, gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';
import { SplitText } from 'gsap/SplitText';
import { autoMount3D } from '../../ds/fx3d.js';
import './home.css';

gsap.registerPlugin(SplitText);
initSite();
autoMount3D();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mm = gsap.matchMedia();

// ---------------------------------------------------------------------------
// Headings: masked line reveal (hero plays on load, others on scroll)
// ---------------------------------------------------------------------------
mm.add('(prefers-reduced-motion: no-preference)', () => {
  const run = () => {
    $$('[data-split]').forEach((el) => {
      const isHero = el.id === 'hero-title';
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
    gsap.from('.home-hero__media', { scale: 0.94, opacity: 0, duration: 1.4, ease: 'expo.out', delay: 0.2 });
    ScrollTrigger.refresh();
  };
  document.fonts ? document.fonts.ready.then(run) : run();
});

// ---------------------------------------------------------------------------
// Hero media: subtle 3D tilt toward the pointer
// ---------------------------------------------------------------------------
const tilt = $('[data-tilt]');
if (tilt && matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
  const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.8, ease: 'power3' });
  const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.8, ease: 'power3' });
  gsap.set(tilt, { transformPerspective: 1200 });
  $('.home-hero').addEventListener('pointermove', (e) => {
    const r = tilt.getBoundingClientRect();
    ry(((e.clientX - (r.left + r.width / 2)) / r.width) * 8);
    rx(-((e.clientY - (r.top + r.height / 2)) / r.height) * 8);
  });
  $('.home-hero').addEventListener('pointerleave', () => {
    rx(0);
    ry(0);
  });
}

// ---------------------------------------------------------------------------
// Growth loop: stages light up in sequence as the section scrolls through
// ---------------------------------------------------------------------------
const loop = $('[data-loop]');
if (loop) {
  const items = $$(':scope > li', loop);
  const stages = items.filter((li) => li.classList.contains('stage'));
  // stage n is items[2n]; arrows before it light up as the path so far
  const setActive = (n) =>
    items.forEach((li, i) => li.classList.toggle('is-active', li.classList.contains('stage') ? i === 2 * n : i < 2 * n));
  if (reduceMotion) stages.forEach((s) => s.classList.add('is-active'));
  else
    ScrollTrigger.create({
      trigger: loop,
      start: 'top 75%',
      end: 'bottom 35%',
      onUpdate: (self) => setActive(Math.min(stages.length - 1, Math.floor(self.progress * stages.length))),
      onLeave: () => setActive(stages.length - 1),
    });
  if (!reduceMotion) gsap.from(stages, { y: 24, opacity: 0, stagger: 0.06, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: loop, start: 'top 85%' } });
}

// ---------------------------------------------------------------------------
// Funnel: bars grow from the centre, staggered top to bottom
// ---------------------------------------------------------------------------
mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.from('[data-funnel] li', {
    scaleX: 0.2,
    opacity: 0,
    duration: 1,
    ease: 'expo.out',
    stagger: 0.07,
    scrollTrigger: { trigger: '[data-funnel]', start: 'top 80%' },
  });
  // Industries: cards rise into their staggered heights
  gsap.from('.film', { yPercent: 18, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: '.filmstrip', start: 'top 85%' } });
  // Comparison rows cascade in
  gsap.from('.compare__table tbody tr', { opacity: 0, y: 12, duration: 0.6, ease: 'power2.out', stagger: 0.035, scrollTrigger: { trigger: '.compare__table', start: 'top 80%' } });
});

// ---------------------------------------------------------------------------
// Testimonials: pick a quote card to feature it (crossfade)
// ---------------------------------------------------------------------------
const featured = $('.quote-featured');
$$('.quote-card').forEach((card) =>
  card.addEventListener('click', () => {
    const data = JSON.parse(card.dataset.quote);
    $$('.quote-card').forEach((c) => c.setAttribute('aria-pressed', String(c === card)));
    const swap = () => {
      $('[data-quote-text]', featured).textContent = data.text;
      $('[data-quote-name]', featured).textContent = data.name;
      $('[data-quote-role]', featured).textContent = data.role;
    };
    if (reduceMotion) return swap();
    gsap.timeline()
      .to(featured.children, { opacity: 0, y: -8, duration: 0.2, stagger: 0.03 })
      .add(swap)
      .to(featured.children, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'expo.out' });
  }),
);
$$('.quote-card').forEach((c) => c.setAttribute('aria-pressed', 'false'));

// ---------------------------------------------------------------------------
// How it starts: connector fills with scroll (desktop) / stepper (mobile)
// ---------------------------------------------------------------------------
const timeline = $('[data-timeline]');
if (timeline) {
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

  mm.add('(min-width: 901px)', () => {
    const st = ScrollTrigger.create({
      trigger: timeline,
      start: 'top 70%',
      end: 'bottom 45%',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress * (nodes.length - 1);
        fills.forEach((f, k) => gsap.set(f, { scaleX: gsap.utils.clamp(0, 1, p - k) }));
        nodes.forEach((n, k) => n.classList.toggle('is-active', p >= k - 0.02));
      },
    });
    return () => st.kill();
  });
}

// ---------------------------------------------------------------------------
// Hero: floating data chips + scroll-out parallax; stage cards flip in 3D
// ---------------------------------------------------------------------------
mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.from('.home-hero__chip', { opacity: 0, y: 16, scale: 0.9, duration: 1, ease: 'back.out(1.6)', stagger: 0.15, delay: 0.9 });
  gsap.to('.home-hero__chip--a', { y: -10, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('.home-hero__chip--b', { y: 10, duration: 3.1, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('.home-hero__copy', {
    yPercent: -12,
    opacity: 0.35,
    ease: 'none',
    scrollTrigger: { trigger: '.home-hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.from('.growth__loop .stage', {
    rotationY: -35,
    transformPerspective: 900,
    transformOrigin: 'left center',
    duration: 1.1,
    ease: 'expo.out',
    stagger: 0.07,
    scrollTrigger: { trigger: '[data-loop]', start: 'top 85%' },
  });
});

// ---------------------------------------------------------------------------
// Magnetic CTAs (fine pointers only) — uses the CSS translate property
// ---------------------------------------------------------------------------
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
  $$('.btn').forEach((btn) => {
    btn.dataset.magnetic = '';
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.25;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.35;
      btn.style.translate = x + 'px ' + y + 'px';
    });
    btn.addEventListener('pointerleave', () => (btn.style.translate = '0 0'));
  });
}
