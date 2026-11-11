import { initSite, gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';
import { Flip } from 'gsap/Flip';
import { autoMount3D } from '../../ds/fx3d.js';
import { $, $$, SplitText, splitHeadings, magnetic, tilt } from '../careers/motion.js';
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
    const state = reduceMotion ? null : Flip.getState(members);
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
