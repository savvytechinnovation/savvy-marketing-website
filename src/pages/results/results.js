// Results hub — Figma "Results Hub A" (filter-first grid). Filters live in the URL (?industry=hvac&type=commercial&stage=convert).
import { initSite, gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';
import { mount3D } from '../../ds/fx3d.js';
import { Flip } from 'gsap/Flip';
import { INDUSTRIES, TYPES, STAGES, sortedCases, industryOf, typeLabel, stageLabel } from '../../content/cases.js';
import { featuredCase, caseCard, esc } from './render.js';
import { $, $$, trackHeaderOffset, revealHeadings, magnetic, tilt } from './shared.js';
import { mountGrowth3D } from './growth3d.js';
import './results.css';

gsap.registerPlugin(Flip);
initSite();
trackHeaderOffset();
revealHeadings();

const PAGE = 9; // "Load more" after 9 cards (structure map B)
const ALL = sortedCases();
const KEYS = ['industry', 'type', 'stage'];
const valid = { industry: INDUSTRIES.map((i) => i.id), type: TYPES.map((t) => t.id), stage: STAGES.map((s) => s.id) };

const grid = $('[data-grid]');
const cards = $$('.case-card', grid);
const featuredSection = $('.rh-featured');
const slot = $('[data-featured-slot]');
const empty = $('[data-empty]');
const more = $('[data-more]');
const sheet = $('#filters-sheet');
const epLink = $('[data-ep-link]');

// Cards use inline display (not [hidden]) so GSAP Flip can animate them in/out.
cards.forEach((c) => {
  if (c.hidden) c.style.display = 'none';
  c.hidden = false;
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const params = new URLSearchParams(location.search);
const state = Object.fromEntries(KEYS.map((k) => [k, valid[k].includes(params.get(k)) ? params.get(k) : 'all']));
let shown = PAGE;
let featuredSlug = slot.querySelector('[data-case]')?.dataset.case;
let featured3D = null;

const matches = (s = state) =>
  ALL.filter((c) => (s.industry === 'all' || c.industry === s.industry) && (s.type === 'all' || c.types.includes(s.type)) && (s.stage === 'all' || c.stages.includes(s.stage)));
const pickFeatured = (list) => list.find((c) => c.featured) || list[0] || null;
const strAllowed = (industry) => industry === 'all' || TYPES.find((t) => t.id === 'str').only.includes(industry);
const activeCount = (s = state) => KEYS.filter((k) => s[k] !== 'all').length;

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function syncChips(root, s) {
  $$('.chip', root).forEach((chip) => {
    const k = chip.dataset.filter;
    chip.setAttribute('aria-pressed', String(s[k] === chip.dataset.value));
    if (k === 'type' && chip.dataset.value === 'str') chip.hidden = !strAllowed(s.industry);
  });
}

function emptyState(s) {
  const ind = s.industry !== 'all' ? industryOf(s.industry) : null;
  const what = [s.type !== 'all' ? typeLabel(s.type).toLowerCase() : '', ind ? ind.label.toLowerCase() : ''].filter(Boolean).join(' ') || 'matching';
  const withStage = s.stage !== 'all' ? ` using ${stageLabel(s.stage)}` : '';
  const closest = ALL.find((c) => ind && c.industry === ind.id) || ALL[0];
  const sameIndustry = ind ? ALL.filter((c) => c.industry === ind.id).length : 0;
  const actions = ind
    ? `<a class="btn btn--l" href="${ind.page}"><span>${esc(ind.label)} industry page</span><span class="btn__icon"><img src="/ds/icons/arrow-up-right.svg" alt="" width="20" height="20" /></span></a>
       <button type="button" class="ghost-btn" data-widen>Show all ${esc(ind.label)} (${sameIndustry})</button>`
    : `<button type="button" class="ghost-btn" data-widen>Clear filters</button>`;
  return `<div class="rh-empty__text">
      <h3 class="rh-empty__title">No ${esc(what)} case${esc(withStage)} yet.</h3>
      <p>We’re documenting one now. In the meantime, here’s the closest match${ind ? ` and how we approach ${esc(what)}` : ''}.</p>
      <div class="rh-empty__actions">${actions}</div>
    </div>
    <div class="rh-empty__closest"><p class="eyebrow">Closest match</p>${caseCard(closest)}</div>`;
}

function setFeatured(c, animate) {
  if (!c) return;
  if (c.slug === featuredSlug) return;
  featuredSlug = c.slug;
  const swap = () => {
    featured3D?.destroy();
    featured3D = null;
    slot.innerHTML = featuredCase(c);
    enhanceFeatured();
  };
  if (!animate || reduceMotion) return swap();
  gsap.timeline()
    .to(slot, { opacity: 0, y: 12, duration: 0.25, ease: 'power2.in' })
    .add(swap)
    .fromTo(slot, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
}

function enhanceFeatured() {
  const photo = $('.featured__photo', slot);
  mount3D(photo, { scene: 'field', scrub: true }).then((api) => (featured3D = api));
  tilt(photo, 4);
  magnetic($$('.btn', slot));
}

function render({ animate = true } = {}) {
  const list = matches();
  const feat = pickFeatured(list);
  const rest = list.filter((c) => c !== feat);
  const visible = new Set(rest.slice(0, shown).map((c) => c.slug));

  // grid (Flip re-layout)
  const flipState = animate && !reduceMotion ? Flip.getState(cards) : null;
  cards.forEach((card) => (card.style.display = visible.has(card.dataset.case) ? '' : 'none'));
  // keep DOM order = newest first among visible
  if (flipState)
    Flip.from(flipState, {
      duration: 0.7,
      ease: 'power3.inOut',
      absolute: true,
      stagger: 0.03,
      scale: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out', delay: 0.15 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.35, ease: 'power2.in' }),
      onComplete: () => ScrollTrigger.refresh(),
    });

  // featured + empty state
  featuredSection.hidden = !feat;
  setFeatured(feat, animate);
  empty.hidden = list.length > 0;
  if (!list.length) empty.innerHTML = emptyState(state);
  else empty.innerHTML = '';

  // counts, clear, load more
  const label = `Showing ${list.length} of ${ALL.length}`;
  $$('[data-count-label]').forEach((el) => (el.textContent = label));
  $('[data-clear]').hidden = activeCount() === 0;
  const badge = $('[data-active-count]');
  badge.hidden = activeCount() === 0;
  badge.textContent = activeCount();
  const remaining = rest.length - visible.size;
  more.hidden = remaining <= 0;
  if (remaining > 0) {
    $('[data-more-btn]').textContent = `Show ${Math.min(PAGE, remaining)} more case${Math.min(PAGE, remaining) === 1 ? '' : 's'}`;
    $('[data-more-count]').textContent = `Showing ${visible.size + (feat ? 1 : 0)} of ${list.length}`;
  }

  // chips, URL, closing CTA carries the industry
  syncChips($('[data-filters]'), state);
  const q = new URLSearchParams();
  KEYS.forEach((k) => state[k] !== 'all' && q.set(k, state[k]));
  history.replaceState(null, '', `${location.pathname}${q.toString() ? `?${q}` : ''}${location.hash}`);
  epLink.href = `/explore-partnership/${state.industry !== 'all' ? `?industry=${state.industry}` : ''}`;
}

function setFilter(k, v) {
  state[k] = v;
  if (k === 'industry' && state.type === 'str' && !strAllowed(v)) state.type = 'all';
  shown = PAGE;
  render();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
$('[data-filters]').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip) setFilter(chip.dataset.filter, chip.dataset.value);
  if (e.target.closest('[data-clear]')) {
    KEYS.forEach((k) => (state[k] = 'all'));
    shown = PAGE;
    render();
    $('.chip[data-filter="industry"][data-value="all"]').focus();
  }
});

empty.addEventListener('click', (e) => {
  if (!e.target.closest('[data-widen]')) return;
  state.type = 'all';
  state.stage = 'all';
  if (state.industry !== 'all' && !ALL.some((c) => c.industry === state.industry)) state.industry = 'all';
  render();
});

$('[data-more-btn]').addEventListener('click', () => {
  shown += PAGE;
  render();
});

// Mobile sheet: choices are staged and applied with "Show N results"
const staged = { ...state };
const syncSheet = () => {
  syncChips(sheet, staged);
  const n = matches(staged).length;
  $('[data-sheet-apply-label]').textContent = `Show ${n} result${n === 1 ? '' : 's'}`;
};
sheet.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip) {
    staged[chip.dataset.filter] = chip.dataset.value;
    if (staged.type === 'str' && !strAllowed(staged.industry)) staged.type = 'all';
    syncSheet();
  }
  if (e.target.closest('[data-sheet-clear]')) {
    KEYS.forEach((k) => (staged[k] = 'all'));
    syncSheet();
  }
  if (e.target.closest('[data-sheet-apply]')) {
    Object.assign(state, staged);
    shown = PAGE;
    sheet.close();
    render();
    featuredSection.scrollIntoView({ block: 'start' });
  }
});
$('.rh-filters__open').addEventListener('click', () => {
  Object.assign(staged, state);
  syncSheet();
});

// Sticky bar: compact padding once it is stuck under the header
const bar = $('[data-filters]');
const onScroll = () => {
  const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 0;
  bar.classList.toggle('is-stuck', bar.getBoundingClientRect().top <= top + 1 && scrollY > 200);
};
addEventListener('scroll', onScroll, { passive: true });

// ---------------------------------------------------------------------------
// Motion: 3D hero chart, card entrance, magnetic CTAs
// ---------------------------------------------------------------------------
mountGrowth3D($('[data-growth3d]'), { scrub: true });
enhanceFeatured();
magnetic($$('.rh-inside .btn, .rh-cta .btn'));

const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.from('.rh-filters .chip', { y: 10, opacity: 0, duration: 0.6, stagger: 0.03, ease: 'expo.out', delay: 0.5, clearProps: 'transform,opacity' });
  ScrollTrigger.batch(cards, {
    start: 'top 92%',
    once: true,
    onEnter: (els) => gsap.from(els, { y: 40, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out', clearProps: 'transform,opacity' }),
  });
  // the dark "Inside view" strip scales up into place as it scrolls in
  gsap.fromTo('.rh-inside', { scale: 0.94, borderRadius: 48 }, { scale: 1, borderRadius: 24, ease: 'none', scrollTrigger: { trigger: '.rh-inside', start: 'top 95%', end: 'top 55%', scrub: true } });
});

render({ animate: false });
