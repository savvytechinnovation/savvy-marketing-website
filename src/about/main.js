import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createScene } from './scene.js';
import '../styles/about.css';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

// ---------------------------------------------------------------------------
// Lenis smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in sync
// ---------------------------------------------------------------------------
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: !reduceMotion,
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -40 });
  });
});

// ---------------------------------------------------------------------------
// Three.js scene
// ---------------------------------------------------------------------------
const { state, ready } = createScene(document.querySelector('.webgl'));

// ---------------------------------------------------------------------------
// Intro: loader -> hero reveal
// ---------------------------------------------------------------------------
lenis.stop();
const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

Promise.all([ready, fontsReady]).then(() => {
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => lenis.start() });
  intro
    .to('.loader__bar span', { scaleX: 1, duration: 0.6, ease: 'power2.inOut' })
    .to('.loader', { yPercent: -100, duration: 1, ease: 'expo.inOut' })
    .from(state, { scale: 0.2, rotY: '-=' + Math.PI * 2, z: -6, duration: 2.2 }, '-=0.6')
    .from('.nav', { y: -40, opacity: 0, duration: 1 }, '<0.3')
    .from('.hero__eyebrow', { y: 20, opacity: 0, duration: 1 }, '<')
    .from('.hero__title .line > span', { yPercent: 110, duration: 1.3, stagger: 0.1 }, '<0.1')
    .from(['.hero__sub', '.hero__scroll'], { y: 20, opacity: 0, duration: 1, stagger: 0.1 }, '<0.4');
});

if (reduceMotion) {
  gsap.globalTimeline.timeScale(20);
}

// ---------------------------------------------------------------------------
// Scroll choreography for the 3D logo
// ---------------------------------------------------------------------------
ScrollTrigger.matchMedia({
  '(min-width: 900px)': () => setupLogoScroll(2.6),
  '(max-width: 899px)': () => setupLogoScroll(0),
});

function setupLogoScroll(sideX) {
  // Hero resting pose: to the right of the headline on desktop, above it on mobile
  gsap.set(state, sideX ? { x: 2.4, y: 0.2, scale: 0.85, rotY: -0.35 } : { x: 0, y: 1.25, scale: 0.6 });

  // Hero -> manifesto: logo drifts to the side and turns
  gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
  })
    .to(state, { x: sideX, y: sideX ? 0 : 1.6, rotY: Math.PI, rotX: 0.3, scale: sideX ? 0.75 : 0.5, ease: 'none' }, 0);

  // Manifesto -> values: logo fades into the background
  gsap.to(state, {
    opacity: 0,
    scale: 0.4,
    rotY: Math.PI * 2,
    ease: 'none',
    scrollTrigger: { trigger: '.stats', start: 'top bottom', end: 'top 30%', scrub: 1 },
  });

  // CTA: logo comes back centre stage
  gsap.fromTo(
    state,
    { opacity: 0, x: 0, y: -2, scale: 0.4, rotY: Math.PI * 2, rotX: 0 },
    {
      opacity: 1,
      x: 0,
      y: sideX ? 2.2 : 2.0,
      scale: sideX ? 0.42 : 0.38,
      rotY: Math.PI * 4,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'center center', scrub: 1 },
    },
  );
}

// ---------------------------------------------------------------------------
// Manifesto: split into words, light them up while scrolling
// ---------------------------------------------------------------------------
document.querySelectorAll('[data-reveal-words]').forEach((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(' ');
  gsap.fromTo(
    el.querySelectorAll('.word'),
    { opacity: 0.12 },
    {
      opacity: 1,
      stagger: 0.05,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
    },
  );
});

// ---------------------------------------------------------------------------
// Stats counters
// ---------------------------------------------------------------------------
document.querySelectorAll('[data-count]').forEach((el) => {
  const counter = { v: 0 };
  const end = Number(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  gsap.to(counter, {
    v: end,
    duration: 2,
    ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    onUpdate: () => (el.textContent = Math.round(counter.v) + suffix),
  });
});

gsap.from('.stat', {
  y: 60,
  opacity: 0,
  stagger: 0.12,
  duration: 1,
  ease: 'expo.out',
  scrollTrigger: { trigger: '.stats', start: 'top 80%' },
});

// ---------------------------------------------------------------------------
// Values: pinned horizontal scroll on desktop, stacked on mobile
// ---------------------------------------------------------------------------
ScrollTrigger.matchMedia({
  '(min-width: 900px)': () => {
    const track = document.querySelector('.values__track');
    const distance = () => track.scrollWidth - window.innerWidth + 80;
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.values',
        pin: '.values__pin',
        start: 'top top',
        end: () => `+=${distance()}`,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
    gsap.utils.toArray('.value-card').forEach((card) => {
      gsap.from(card, {
        rotateY: -25,
        opacity: 0.2,
        scale: 0.9,
        ease: 'none',
        scrollTrigger: {
          trigger: card,
          containerAnimation: tween,
          start: 'left right',
          end: 'left 55%',
          scrub: true,
        },
      });
    });
  },
  '(max-width: 899px)': () => {
    gsap.utils.toArray('.value-card').forEach((card) => {
      gsap.from(card, { y: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 85%' } });
    });
  },
});

// ---------------------------------------------------------------------------
// Timeline: progress line + items
// ---------------------------------------------------------------------------
gsap.fromTo(
  '.timeline__progress',
  { scaleY: 0 },
  {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.timeline__list', start: 'top 70%', end: 'bottom 60%', scrub: true },
  },
);
gsap.utils.toArray('.timeline__list li').forEach((li) => {
  gsap.from(li, {
    x: 60,
    opacity: 0,
    duration: 1,
    ease: 'expo.out',
    scrollTrigger: { trigger: li, start: 'top 80%', toggleClass: { targets: li, className: 'is-active' } },
  });
});

// ---------------------------------------------------------------------------
// Section headings + team cards
// ---------------------------------------------------------------------------
gsap.utils.toArray('.timeline__intro, .team__head, .cta .eyebrow, .cta__title').forEach((el) => {
  gsap.from(el, { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
});

gsap.from('.member', {
  y: 100,
  opacity: 0,
  rotateX: -30,
  stagger: 0.12,
  duration: 1.2,
  ease: 'expo.out',
  scrollTrigger: { trigger: '.team__grid', start: 'top 80%' },
});

// 3D tilt on team cards
document.querySelectorAll('.member').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(card, { rotateY: px * 14, rotateX: -py * 14, duration: 0.5, ease: 'power3.out' });
  });
  card.addEventListener('pointerleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' }));
});

// ---------------------------------------------------------------------------
// Marquee: speed reacts to scroll velocity
// ---------------------------------------------------------------------------
const marquee = gsap.to('.marquee__row', { xPercent: -50, duration: 22, ease: 'none', repeat: -1 });
lenis.on('scroll', ({ velocity }) => {
  gsap.to(marquee, { timeScale: 1 + Math.min(Math.abs(velocity) / 8, 5), duration: 0.3, overwrite: true });
});

// ---------------------------------------------------------------------------
// Magnetic button + cursor glow (pointer devices only)
// ---------------------------------------------------------------------------
if (window.matchMedia('(pointer: fine)').matches) {
  const glow = document.querySelector('.cursor-glow');
  const gx = gsap.quickTo(glow, 'x', { duration: 0.6, ease: 'power3' });
  const gy = gsap.quickTo(glow, 'y', { duration: 0.6, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    gx(e.clientX);
    gy(e.clientY);
  });

  document.querySelectorAll('[data-magnetic]').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      gsap.to(btn, {
        x: (e.clientX - r.left - r.width / 2) * 0.35,
        y: (e.clientY - r.top - r.height / 2) * 0.35,
        duration: 0.4,
        ease: 'power3.out',
      });
    });
    btn.addEventListener('pointerleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }));
  });
}

// Nav gets a backdrop once you leave the hero
ScrollTrigger.create({
  start: 80,
  onToggle: (self) => document.querySelector('.nav').classList.toggle('is-scrolled', self.isActive),
});

window.addEventListener('load', () => ScrollTrigger.refresh());
