import { initSite, gsap, ScrollTrigger, reduceMotion, lenis } from '../../ds/site.js';
import { mount3D } from '../../ds/fx3d.js';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { $, $$, initHeadings, initMagnetic, initTilt } from '../industry/motion.js';
import { mountJourney } from './scene-journey.js';
import './growth-system.css';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);
initSite();
const mm = gsap.matchMedia();
initHeadings(mm);
initMagnetic();
initTilt('.stage-card', 3);

// 3D: a dark flowing field behind the hero; the loop is a camera journey through 7 stations
mount3D($('[data-gs-field]'), { scene: 'field', theme: 'dark', scrub: true });
let journey = null;
mountJourney($('[data-loop-3d]'), { reduce: reduceMotion })
  .then((api) => {
    journey = api;
    if (!api) return;
    section.classList.add('has-journey');
    ScrollTrigger.refresh(); // the pinned layout changes once the journey is in
    if (pinST) api.setProgress(pinST.progress);
    else api.goTo(current);
  })
  .catch((err) => console.warn('[journey]', err));

// Kinetic hero title: characters flip up in 3D, words drift away on scroll
mm.add('(prefers-reduced-motion: no-preference)', () => {
  const run = () =>
    SplitText.create('[data-kinetic]', {
      type: 'words,chars',
      wordsClass: 'kw',
      charsClass: 'kc',
      aria: 'auto',
      autoSplit: true,
      onSplit(self) {
        gsap.set(self.chars, { transformPerspective: 700, transformOrigin: '50% 100% -30px' });
        return gsap
          .timeline()
          .from(self.chars, { rotationX: -100, yPercent: 70, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.02, delay: 0.15 })
          .add(
            gsap.to(self.words, {
              y: (i) => -30 - ((i * 41) % 70),
              opacity: 0.15,
              ease: 'none',
              scrollTrigger: { trigger: '.gs-hero', start: 'top top', end: 'bottom top', scrub: true },
            }),
            0,
          );
      },
    });
  document.fonts ? document.fonts.ready.then(run) : run();
  gsap.from('.gs-hero__meta > *', { opacity: 0, y: -8, duration: 0.8, stagger: 0.08, delay: 0.6 });
});

// Hero staircase: a 3D object that follows the pointer
const stair = $('[data-staircase]');
if (stair && matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
  gsap.set(stair, { transformPerspective: 1400, rotationX: 14, rotationY: -18 });
  const rx = gsap.quickTo(stair, 'rotationX', { duration: 1, ease: 'power3' });
  const ry = gsap.quickTo(stair, 'rotationY', { duration: 1, ease: 'power3' });
  $('.gs-hero').addEventListener('pointermove', (e) => {
    rx(14 - (e.clientY / innerHeight - 0.5) * 14);
    ry(-18 + (e.clientX / innerWidth - 0.5) * 22);
  });
}

// Proof values scramble in
$$('.proof .metric__value').forEach((el, i) => {
  if (reduceMotion) return;
  const text = el.textContent;
  ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => gsap.to(el, { duration: 1.3, delay: i * 0.1, scrambleText: { text, chars: '0123456789%$X', revealDelay: 0.35 } }) });
});

// Hero staircase grows step by step on load
mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.from('[data-staircase] .step', { scaleY: 0, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, delay: 0.35 });
});

// ---------------------------------------------------------------------------
// 02 · Before/after slider (range input drives --pos; works with keyboard)
// ---------------------------------------------------------------------------
const compare = $('[data-compare]');
if (compare) {
  const range = $('.compare-slider__range', compare);
  const set = (v) => {
    compare.style.setProperty('--pos', `${v}%`);
    range.setAttribute('aria-valuetext', `${Math.round(100 - v)}% one Growth System`);
  };
  range.addEventListener('input', () => set(Number(range.value)));
  range.addEventListener('pointerdown', () => compare.classList.add('is-dragging'));
  addEventListener('pointerup', () => compare.classList.remove('is-dragging'));
  set(Number(range.value));

  mm.add('(prefers-reduced-motion: no-preference) and (min-width: 901px)', () => {
    // vendors drift slightly: the "fragmented" side never quite sits still
    const tweens = $$('.vendor', compare).map((v, i) =>
      gsap.to(v, { y: gsap.utils.random(-6, 6), x: gsap.utils.random(-4, 4), duration: gsap.utils.random(2.4, 3.6), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 }),
    );
    // first time in view: slider sweeps to hint that it can be dragged
    const intro = gsap.timeline({ scrollTrigger: { trigger: compare, start: 'top 70%', once: true } });
    const o = { v: 50 };
    intro.to(o, { v: 64, duration: 0.7, ease: 'power2.inOut', onUpdate: () => set(o.v) }).to(o, { v: 50, duration: 0.9, ease: 'power3.inOut', onUpdate: () => set(o.v), onComplete: () => (range.value = 50) });
    return () => tweens.forEach((t) => t.kill());
  });
}

// ---------------------------------------------------------------------------
// 03 · The loop: tabbed stage navigator, pinned + scrubbed on desktop,
// deep-linkable via #strategy … #grow
// ---------------------------------------------------------------------------
const section = $('[data-loop-section]');
const pills = $$('.loop__pill', section);
const slugs = pills.map((p) => p.dataset.stage);
const names = pills.map((p) => $('.loop__name', p).textContent);
const blurbs = Object.fromEntries($$('[data-loop-data] li', section).map((li) => [li.dataset.stage, li.textContent]));
const detail = $('[data-loop-detail]', section);
const progress = $('[data-loop-progress]', section);
const comet = $('[data-loop-comet]', section);
const hintbar = $('[data-loop-hintbar]', section);
let current = 0;
let pinST = null;

function render(i, { animate = true } = {}) {
  const changed = i !== current;
  current = i;
  pills.forEach((p, k) => {
    const on = k === i;
    p.setAttribute('aria-selected', String(on));
    p.tabIndex = on ? 0 : -1;
    p.classList.toggle('is-done', k < i);
  });
  detail.setAttribute('aria-labelledby', pills[i].id);
  const swap = () => {
    $('[data-loop-count]', detail).textContent = `STAGE ${String(i + 1).padStart(2, '0')} OF 07`;
    $('[data-loop-title]', detail).textContent = names[i];
    $('[data-loop-text]', detail).textContent = blurbs[slugs[i]];
    $('[data-loop-linkname]', detail).textContent = names[i];
    $('[data-loop-link]', detail).setAttribute('href', `#stage-${slugs[i]}`);
  };
  if (!pinST) setRing((i + 1) / 7);
  if (!changed || !animate || reduceMotion) return swap();
  gsap.killTweensOf(detail.children);
  gsap.timeline()
    .to(detail.children, { opacity: 0, y: -6, duration: 0.15, stagger: 0.02 })
    .add(swap)
    .fromTo(detail.children, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: 'expo.out' });
}

function setRing(p) {
  if (reduceMotion) p = (current + 1) / 7;
  gsap.set(progress, { attr: { 'stroke-dashoffset': 1 - p } });
  if (journey) pinST ? journey.setProgress(p) : journey.goTo(current);
  comet.style.setProperty('--angle', `${-90 + p * 360}deg`);
}

/** Scroll position inside the pinned range where stage i is centred. */
const stageScroll = (i) => pinST.start + ((i + 0.5) / 7) * (pinST.end - pinST.start);

function goTo(i, { updateHash = true, scroll = true } = {}) {
  if (i < 0) return;
  if (updateHash) history.replaceState(null, '', `#${slugs[i]}`);
  if (pinST && scroll) {
    const y = stageScroll(i);
    if (lenis) lenis.scrollTo(y, { duration: reduceMotion ? 0 : 1.1 });
    else scrollTo({ top: y });
    render(i);
  } else {
    render(i);
    if (scroll) {
      const top = section.getBoundingClientRect().top + scrollY - 90;
      if (Math.abs(section.getBoundingClientRect().top) > 200) lenis ? lenis.scrollTo(top, { duration: reduceMotion ? 0 : 1.1 }) : scrollTo({ top });
    }
  }
}

// Clicks + arrow keys come through the DS tabs helper (role=tablist) as "tabchange"
$('[role="tablist"]', section).addEventListener('tabchange', (e) => {
  const i = pills.indexOf(e.detail.tab);
  if (i !== current || !pinST) goTo(i, { scroll: !!pinST });
});
pills.forEach((p, i) =>
  p.addEventListener('keydown', (e) => {
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const to = e.key === 'Home' ? 0 : 6;
      pills[to].focus();
      goTo(to, { scroll: !!pinST });
    }
  }),
);

mm.add('(min-width: 901px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)', () => {
  section.classList.add('is-pinned-mode');
  pinST = ScrollTrigger.create({
    trigger: section,
    pin: '[data-loop-pin]',
    start: 'top top',
    end: () => `+=${Math.round(innerHeight * 0.55 * 7)}`,
    scrub: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const p = self.progress;
      setRing(p);
      hintbar.style.transform = `scaleX(${p})`;
      const i = Math.min(6, Math.floor(p * 7));
      if (i !== current) render(i);
    },
  });
  // ring / comet start state for the current scroll position
  setRing(pinST.progress);
  gsap.from(pills, { scale: 0.6, opacity: 0, duration: 0.8, ease: 'back.out(1.6)', stagger: 0.06, scrollTrigger: { trigger: section, start: 'top 75%' } });
  return () => {
    section.classList.remove('is-pinned-mode');
    pinST = null;
    setRing((current + 1) / 7);
  };
});

// Deep links: #convert (loop) and #stage-convert (detail card)
const stageFromHash = () => slugs.indexOf(location.hash.slice(1));
addEventListener('hashchange', () => {
  const i = stageFromHash();
  if (i >= 0) goTo(i, { updateHash: false });
  else if (location.hash.startsWith('#stage-')) highlightCard(location.hash.slice(1));
});
const initial = stageFromHash();
render(initial >= 0 ? initial : 0, { animate: false });
if (initial >= 0) {
  // wait for fonts + pin spacer so the computed position is final
  const jump = () => {
    ScrollTrigger.refresh();
    goTo(initial, { updateHash: false });
  };
  addEventListener('load', () => setTimeout(jump, 60), { once: true });
}

// ---------------------------------------------------------------------------
// 04 · Stage carousel: arrows, progress segments, "Go to …" links
// ---------------------------------------------------------------------------
const track = $('[data-stage-track]');
const cards = $$('.stage-card', track);
const segs = $$('[data-stage-progress] button');
const prevBtn = $('[data-stages-prev]');
const nextBtn = $('[data-stages-next]');
const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
const activeCard = () => Math.max(0, Math.min(cards.length - 1, Math.round(track.scrollLeft / step())));

function syncCarousel() {
  const i = activeCard();
  segs.forEach((s, k) => s.setAttribute('aria-current', String(k === i)));
  prevBtn.disabled = track.scrollLeft < 4;
  nextBtn.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 4;
}
const scrollToCard = (i, smooth = true) => track.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
track.addEventListener('scroll', () => requestAnimationFrame(syncCarousel), { passive: true });
prevBtn.addEventListener('click', () => scrollToCard(Math.max(0, activeCard() - 1)));
nextBtn.addEventListener('click', () => scrollToCard(Math.min(cards.length - 1, activeCard() + 1)));
segs.forEach((s, i) => s.addEventListener('click', () => scrollToCard(i)));
track.addEventListener('keydown', (e) => {
  const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (!d || e.target !== track) return;
  e.preventDefault();
  scrollToCard(Math.max(0, Math.min(cards.length - 1, activeCard() + d)));
});
syncCarousel();

function highlightCard(id) {
  const card = document.getElementById(id);
  if (!card) return;
  const i = cards.indexOf(card);
  if (getComputedStyle(track).overflowX !== 'visible') scrollToCard(i, false);
  cards.forEach((c) => c.classList.toggle('is-target', c === card));
  setTimeout(() => card.classList.remove('is-target'), 3000);
}
$('[data-loop-link]').addEventListener('click', (e) => {
  const id = e.currentTarget.getAttribute('href').slice(1);
  if (!lenis) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }
  highlightCard(id);
});
if (location.hash.startsWith('#stage-')) addEventListener('load', () => highlightCard(location.hash.slice(1)), { once: true });

// ---------------------------------------------------------------------------
// Scorecard rows and capability chips cascade in
// ---------------------------------------------------------------------------
mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.from('.scorecard tbody tr', { opacity: 0, x: -12, duration: 0.6, ease: 'power2.out', stagger: 0.05, scrollTrigger: { trigger: '.scorecard', start: 'top 80%' } });
  gsap.from('.caps__col li', { opacity: 0, y: 10, duration: 0.5, ease: 'power2.out', stagger: 0.015, scrollTrigger: { trigger: '.caps__cols', start: 'top 80%' } });
});
