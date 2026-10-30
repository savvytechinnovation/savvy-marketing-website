import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { initContactForm } from './form.js';
import '../styles/home.css';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isDesktop = () => matchMedia('(min-width: 900px)').matches;

$$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

// ---------------------------------------------------------------------------
// Smooth scroll: Lenis driven by GSAP's ticker (verified in labs/01: no scrub lag)
// ---------------------------------------------------------------------------
const lenis = new Lenis({ duration: 1.15, anchors: false });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

const scrollToTarget = (target) => lenis.scrollTo(target, { offset: -20, duration: reduceMotion ? 0 : 1.4 });
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(target);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }),
);
$('[data-to-top]')?.addEventListener('click', () => lenis.scrollTo(0, { duration: reduceMotion ? 0 : 1.6 }));

// ---------------------------------------------------------------------------
// WebGL scene (lazy, optional: the page works fully without it)
// ---------------------------------------------------------------------------
let scene = null;
const sceneReady = import('./scene.js')
  .then(({ createHomeScene }) => {
    scene = createHomeScene($('.webgl'), { lowPower: !isDesktop() });
    return scene.ready;
  })
  .catch((err) => {
    console.warn('WebGL disabled:', err);
    document.documentElement.classList.add('no-webgl');
  });

lenis.on('scroll', ({ velocity }) => {
  if (scene) scene.state.velocity = velocity;
});

// ---------------------------------------------------------------------------
// Loader -> intro
// ---------------------------------------------------------------------------
lenis.stop();
const counter = { v: 0 };
const countEl = $('[data-loader-count]');
const loaderTween = gsap.to(counter, {
  v: 90,
  duration: 2.4,
  ease: 'power2.out',
  onUpdate: () => (countEl.textContent = Math.round(counter.v)),
});
const minTime = new Promise((r) => setTimeout(r, reduceMotion ? 0 : 900));
const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
// Never block the content on WebGL for more than 3.5s
const capped = (p) => Promise.race([p, new Promise((r) => setTimeout(r, 3500))]);

Promise.all([capped(sceneReady), fontsReady, minTime]).then(() => {
  loaderTween.kill();
  const tl = gsap.timeline({ defaults: { ease: 'expo.inOut' }, onComplete: () => lenis.start() });
  tl.to(counter, { v: 100, duration: 0.35, ease: 'power1.out', onUpdate: () => (countEl.textContent = Math.round(counter.v)) })
    .to('.loader__inner', { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' })
    .to('.loader__panel--top', { yPercent: -100, duration: 1.1 }, '<0.2')
    .to('.loader__panel--bottom', { yPercent: 100, duration: 1.1 }, '<')
    .set('.loader', { display: 'none' });
  heroIntro(tl);
});

function heroIntro(tl) {
  if (scene) tl.from(scene.state.orb, { scale: 0.2, opacity: 0, duration: 2, ease: 'expo.out' }, '-=0.7');
  tl.from('.nav > *', { y: -30, opacity: 0, stagger: 0.06, duration: 1, ease: 'expo.out' }, '<0.2')
    .from('.hero__title .line > span', { yPercent: 115, duration: 1.3, stagger: 0.1, ease: 'expo.out' }, '<')
    .from(['.badge', '.hero__sub', '.hero__actions > *', '.hero__hint'], { y: 24, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out' }, '<0.4')
    .add(startRotator);
}

// Rotating last word of the headline
function startRotator() {
  const el = $('[data-rotator]');
  if (!el || reduceMotion) return;
  const words = el.dataset.words.split(',');
  let i = 0;
  gsap.timeline({ repeat: -1, repeatDelay: 1.8, delay: 1.8 })
    .to(el, { yPercent: -100, opacity: 0, duration: 0.45, ease: 'power3.in' })
    .call(() => {
      i = (i + 1) % words.length;
      el.textContent = words[i];
    })
    .fromTo(el, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out', immediateRender: false });
}

// Click / tap on the hero -> ripple travels over the orb
$('.hero').addEventListener('pointerdown', (e) => {
  if (!scene || e.target.closest('a, button')) return;
  gsap.fromTo(scene.uniforms.uPulse, { value: 0 }, { value: 1, duration: 1.6, ease: 'power2.out' });
});

// ---------------------------------------------------------------------------
// Orb + logo choreography across sections
// ---------------------------------------------------------------------------
sceneReady.then(() => {
  if (!scene) return;
  const { orb, logo } = scene.state;

  ScrollTrigger.matchMedia({
    '(min-width: 900px)': () => {
      gsap.set(orb, { x: 2.3, y: -0.1, scale: 1 });
      orbTimeline({ heroOut: { x: -2.6, y: -0.3, scale: 0.55 }, services: { x: 3.4, y: 0.4, scale: 0.7, opacity: 0.32 } });
    },
    '(max-width: 899px)': () => {
      gsap.set(orb, { x: 0, y: 1.2, scale: 0.62 });
      orbTimeline({ heroOut: { x: 0.6, y: 1.6, scale: 0.4 }, services: { x: 0, y: 0, scale: 0.6, opacity: 0.25 } });
    },
  });

  function orbTimeline({ heroOut, services }) {
    gsap.to(orb, { ...heroOut, ease: 'none', scrollTrigger: { trigger: '.intro', start: 'top bottom', end: 'top 20%', scrub: 1 } });
    gsap.fromTo(orb, { ...heroOut, opacity: 1 }, { ...services, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '.services', start: 'top bottom', end: 'top 30%', scrub: 1 } });
    gsap.fromTo(orb, { opacity: services.opacity }, { opacity: 0, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '.services', start: 'bottom 80%', end: 'bottom 30%', scrub: 1 } });
  }

  // Logo: appears next to the form and tracks its slot in the layout
  const slot = $('.contact__logo-space');
  gsap.fromTo(logo, { opacity: 0, scale: 0.2, rotY: -Math.PI }, {
    opacity: 1, scale: isDesktop() ? 0.75 : 0.5, rotY: Math.PI * 2, ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'top 85%', end: 'top 15%', scrub: 1 },
  });
  const camZ = 9, halfFov = Math.tan((35 * Math.PI) / 360);
  gsap.ticker.add(() => {
    if (logo.opacity < 0.01) return;
    const r = slot.getBoundingClientRect();
    const halfH = camZ * halfFov, halfW = halfH * (innerWidth / innerHeight);
    logo.x = ((r.left + r.width / 2) / innerWidth) * 2 * halfW - halfW;
    logo.y = -(((r.top + r.height / 2) / innerHeight) * 2 * halfH - halfH);
  });
});

// ---------------------------------------------------------------------------
// Text reveals
// ---------------------------------------------------------------------------
const mm = gsap.matchMedia();

mm.add('(prefers-reduced-motion: no-preference)', () => {
  document.fonts?.ready.then(() => {
    $$('[data-split]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true, aria: 'auto',
        onSplit: (self) => gsap.from(self.lines, { yPercent: 110, stagger: 0.1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } }),
      });
    });

    $$('[data-reveal-words], [data-split-quote]').forEach((el) => {
      const split = SplitText.create(el, { type: 'words', aria: 'auto' });
      gsap.fromTo(split.words, { opacity: 0.12 }, {
        opacity: 1, stagger: 0.05, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: true },
      });
    });
    ScrollTrigger.refresh();
  });

  // Counters
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onStart: () => (el.textContent = `0${el.dataset.suffix}`),
      onUpdate: () => (el.textContent = obj.v.toFixed(decimals) + el.dataset.suffix),
    });
  });

  gsap.from('.stat', { y: 50, opacity: 0, stagger: 0.1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.stats', start: 'top 85%' } });

  // Marquee whose speed follows scroll velocity
  const marquee = gsap.to('.marquee__row', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
  lenis.on('scroll', ({ velocity }) => {
    gsap.to(marquee, { timeScale: 1 + Math.min(Math.abs(velocity) / 6, 6), duration: 0.3, overwrite: true });
  });

  // Process cards: the card underneath shrinks as the next one stacks on top
  $$('.step').forEach((step, i, all) => {
    if (i === all.length - 1) return;
    gsap.to(step, {
      scale: 0.93, '--shade': 1, ease: 'none',
      scrollTrigger: { trigger: all[i + 1], start: 'top bottom', end: 'top 25%', scrub: true },
    });
  });

  // Work: pinned horizontal scroll on desktop
  mm.add('(min-width: 900px)', () => {
    const track = $('.work__track');
    const distance = () => track.scrollWidth - innerWidth + 80;
    gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: { trigger: '.work', pin: '.work__pin', start: 'top top', end: () => `+=${distance()}`, scrub: 1, invalidateOnRefresh: true },
    });
  });
});

// Light theme while the process section is in view (colours transition in CSS)
ScrollTrigger.create({
  trigger: '.process',
  start: 'top 55%',
  end: 'bottom 45%',
  onToggle: (self) => document.body.classList.toggle('theme-light', self.isActive),
});

// Scroll progress bar
gsap.to('.scroll-progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

// Nav background after the hero
ScrollTrigger.create({ start: 60, onToggle: (self) => $('.nav').classList.toggle('is-scrolled', self.isActive) });

// ---------------------------------------------------------------------------
// Services: accordion on click, orb palette on hover/focus
// ---------------------------------------------------------------------------
$$('.service').forEach((item) => {
  const row = $('.service__row', item);
  const body = $('.service__body', item);
  row.addEventListener('click', () => {
    const open = row.getAttribute('aria-expanded') !== 'true';
    $$('.service__row[aria-expanded="true"]').forEach((r) => r !== row && toggle(r, false));
    toggle(row, open);
  });
  const activate = () => setPalette(Number(item.dataset.palette));
  item.addEventListener('pointerenter', activate);
  row.addEventListener('focus', activate);
  item.addEventListener('pointerleave', () => setPalette(0));

  function toggle(r, open) {
    r.setAttribute('aria-expanded', String(open));
    const b = r.nextElementSibling;
    gsap.to(b, { height: open ? 'auto' : 0, duration: reduceMotion ? 0 : 0.6, ease: 'expo.out', onComplete: () => ScrollTrigger.refresh() });
  }
  gsap.set(body, { height: 0 });
});

function setPalette(i) {
  if (!scene) return;
  const p = scene.palettes[i] || scene.palettes[0];
  const u = scene.uniforms;
  for (const [key, hex] of [['uColorA', p.a], ['uColorB', p.b], ['uRim', p.rim]]) {
    const target = u[key].value.clone().set(hex);
    gsap.to(u[key].value, { r: target.r, g: target.g, b: target.b, duration: 0.9, ease: 'power2.out', overwrite: true });
  }
  gsap.to(u.uFreq, { value: i ? 1.15 : 0.75, duration: 1.2, ease: 'power2.out', overwrite: true });
  gsap.to(u.uSpeed, { value: i ? 0.4 : 0.22, duration: 1.2, overwrite: true });
}

// ---------------------------------------------------------------------------
// Pointer-only interactions: cursor, magnetic buttons, tilt cards, scramble
// ---------------------------------------------------------------------------
if (finePointer && !reduceMotion) {
  const cursor = $('.cursor');
  const label = $('.cursor__label');
  const cx = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    cx(e.clientX);
    cy(e.clientY);
    cursor.classList.add('is-visible');
  });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
  document.addEventListener('pointerover', (e) => {
    const labelled = e.target.closest('[data-cursor]');
    const interactive = e.target.closest('a, button, label, input, textarea');
    cursor.classList.toggle('is-label', Boolean(labelled));
    cursor.classList.toggle('is-hover', Boolean(interactive) && !labelled);
    label.textContent = labelled ? labelled.dataset.cursor : '';
  });

  $$('[data-magnetic]').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.35);
      my((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }));
  });

  $$('.case').forEach((card) => {
    const art = $('.case__art', card) || card;
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(art, { rotateY: px * 12, rotateX: -py * 12, duration: 0.6, ease: 'power3.out' });
      card.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
      card.style.setProperty('--my', `${(py + 0.5) * 100}%`);
    });
    card.addEventListener('pointerleave', () => gsap.to(art, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1, 0.5)' }));
  });

  $$('[data-scramble]').forEach((a) => {
    const text = a.textContent;
    a.setAttribute('aria-label', text);
    a.addEventListener('pointerenter', () => gsap.to(a, { duration: 0.6, scrambleText: { text, chars: 'upperAndLowerCase', speed: 0.6 } }));
  });
}

// ---------------------------------------------------------------------------
// Mobile menu (focus trap, Escape, scroll lock)
// ---------------------------------------------------------------------------
const burger = $('.nav__burger');
const menu = $('#menu');
let menuOpen = false;

burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
function openMenu() {
  menuOpen = true;
  menu.hidden = false;
  burger.setAttribute('aria-expanded', 'true');
  burger.setAttribute('aria-label', 'Close menu');
  document.body.classList.add('menu-open');
  lenis.stop();
  gsap.fromTo(menu, { clipPath: 'circle(0% at calc(100% - 40px) 40px)' }, { clipPath: 'circle(150% at calc(100% - 40px) 40px)', duration: reduceMotion ? 0 : 0.8, ease: 'expo.inOut' });
  gsap.fromTo('.menu li', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: reduceMotion ? 0 : 0.8, ease: 'expo.out', delay: reduceMotion ? 0 : 0.25 });
  $('.menu a').focus();
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Open menu');
  document.body.classList.remove('menu-open');
  lenis.start();
  gsap.to(menu, {
    clipPath: 'circle(0% at calc(100% - 40px) 40px)', duration: reduceMotion ? 0 : 0.6, ease: 'expo.inOut',
    onComplete: () => (menu.hidden = true),
  });
  burger.focus();
}
document.addEventListener('keydown', (e) => {
  if (!menuOpen) return;
  if (e.key === 'Escape') closeMenu();
  if (e.key === 'Tab') {
    const focusables = [burger, ...$$('.menu a')];
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
matchMedia('(min-width: 900px)').addEventListener('change', (e) => e.matches && closeMenu());

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------
initContactForm($('#contact-form'), {
  onSuccess: (panel) => {
    if (!reduceMotion) gsap.from(panel, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out' });
    if (scene) {
      gsap.fromTo(scene.state.logo, { rotY: scene.state.logo.rotY }, { rotY: `+=${Math.PI * 4}`, duration: 2.4, ease: 'expo.out' });
    }
    ScrollTrigger.refresh();
  },
});

addEventListener('load', () => ScrollTrigger.refresh());
