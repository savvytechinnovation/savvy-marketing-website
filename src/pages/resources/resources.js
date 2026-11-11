// Resources hub (/resources/): client-side filtering of the statically generated cards.
// Cards are rendered into the HTML by scripts/build-posts.mjs (SEO); this file only filters, sorts,
// paginates ("Load more") and animates them, and keeps the URL in sync (?type=&industry=&audience=&stage=&q=&sort=).
import { initSite, gsap, ScrollTrigger, reduceMotion, scrollLock } from '../../ds/site.js';
import { stage, library, paintCovers } from './gl-kit.js';
import { chars3D, scrambleIn, velocityMarquee, tiltGlare, distortHover, liveClock, magnet } from './fx-dom.js';
import { Flip } from 'gsap/Flip';
import { initNewsletters } from './newsletter.js';
import { splitHeadings, magnetic, cardsEnter } from './motion.js';
import './resources.css';

gsap.registerPlugin(Flip);
initSite();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const PAGE_SIZE = 6;
const FILTER_KEYS = ['type', 'industry', 'audience', 'stage', 'q'];
const DEFAULTS = { type: '', industry: '', audience: '', stage: '', q: '', sort: 'newest' };
const TYPE_TITLES = { '': 'Latest articles', guide: 'Guides', breakdown: 'Breakdowns', findings: 'Findings', checklist: 'Checklists' };
const LABELS = {
  industry: { hvac: 'HVAC', plumbing: 'Plumbing', electrical: 'Electrical', roofing: 'Roofing', cleaning: 'Cleaning' },
  type: { guide: 'guides', breakdown: 'breakdowns', findings: 'findings', checklist: 'checklists' },
};

const grid = $('[data-grid]');
const items = $$('.rcard-item', grid);
const featuredSection = $('[data-featured]');
const featuredSlug = $('[data-featured-slug]')?.dataset.featuredSlug;
const typeGroup = $('[data-filter-group="type"]');
const searchInput = $('[data-filter="q"]');
const searchClear = $('[data-search-clear]');
const sortSelect = $('[data-filter="sort"]');
const selects = { audience: $('[data-filter="audience"]'), stage: $('[data-filter="stage"]') };
const status = $('[data-status]');
const resultsTitle = $('[data-results-title]');
const empty = $('[data-empty]');
const emptyText = $('[data-empty-text]');
const more = $('[data-more]');
const moreCount = $('[data-more-count]');
const moreBtn = $('[data-load-more]');
const sheet = $('#filters-sheet');
const sheetResults = $('[data-sheet-results]');
const activeCount = $('[data-active-count]');

// ---------------------------------------------------------------------------
// State <-> URL
// ---------------------------------------------------------------------------
const allowed = {
  type: Object.keys(TYPE_TITLES).filter(Boolean),
  industry: Object.keys(LABELS.industry),
  audience: ['residential', 'commercial'],
  stage: ['strategy', 'build', 'generate', 'convert', 'measure', 'optimize', 'grow'],
  sort: ['newest', 'shortest', 'longest'],
};

function readUrl() {
  const params = new URLSearchParams(location.search);
  const state = { ...DEFAULTS };
  for (const key of Object.keys(allowed)) {
    const v = (params.get(key) || '').toLowerCase();
    if (allowed[key].includes(v)) state[key] = v;
  }
  state.q = (params.get('q') || '').slice(0, 80);
  return state;
}

function writeUrl() {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) if (v && v !== DEFAULTS[k]) params.set(k, v);
  const qs = params.toString();
  const next = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
  if (next !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(null, '', next);
}

let state = readUrl();
let visible = PAGE_SIZE;

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------
const tokens = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
const isDefaultView = () => FILTER_KEYS.every((k) => !state[k]);

function matches(li, s = state, ignore) {
  const d = li.dataset;
  if (ignore !== 'type' && s.type && d.type !== s.type) return false;
  if (s.industry && d.industry !== s.industry) return false;
  if (s.audience && !d.audience.split(' ').includes(s.audience)) return false;
  if (s.stage && !d.stages.split(' ').includes(s.stage)) return false;
  return tokens(s.q).every((t) => d.search.includes(t));
}

const sorters = {
  newest: (a, b) => b.dataset.date.localeCompare(a.dataset.date),
  shortest: (a, b) => a.dataset.minutes - b.dataset.minutes || sorters.newest(a, b),
  longest: (a, b) => b.dataset.minutes - a.dataset.minutes || sorters.newest(a, b),
};

function compute() {
  const showFeatured = isDefaultView() && Boolean(featuredSlug);
  const list = items.filter((li) => matches(li) && !(showFeatured && li.dataset.slug === featuredSlug)).sort(sorters[state.sort]);
  return { showFeatured, list, shown: list.slice(0, visible) };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function describe(total) {
  const parts = [];
  if (state.industry) parts.push(LABELS.industry[state.industry]);
  if (state.audience) parts.push(state.audience);
  if (state.stage) parts.push(`${state.stage} stage`);
  const what = state.type ? LABELS.type[state.type] : 'resources';
  const scope = parts.length ? ` · ${parts.join(' · ')}` : '';
  const query = state.q ? ` for “${state.q}”` : '';
  return `${total} ${total === 1 ? what.replace(/s$/, '') : what}${query}${scope}`;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
let firstRender = true;

function render({ animate = true, focusFrom = -1 } = {}) {
  const { showFeatured, list, shown } = compute();
  const total = list.length;
  const flipState = animate && !reduceMotion && !firstRender ? Flip.getState(items) : null;

  // Reorder (sorted matches first) and toggle visibility
  const order = [...list, ...items.filter((li) => !list.includes(li))];
  order.forEach((li) => grid.append(li));
  grid.append(...$$('script', grid)); // keep the JSON-LD block at the end
  items.forEach((li) => (li.hidden = !shown.includes(li)));

  if (flipState) {
    Flip.from(flipState, {
      duration: 0.65,
      ease: 'power3.inOut',
      absolute: true,
      stagger: 0.025,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.55, delay: 0.15, ease: 'power2.out', stagger: 0.04 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.3, ease: 'power2.in' }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  }

  toggleFeatured(showFeatured, !firstRender && animate);

  // Copy
  resultsTitle.textContent = TYPE_TITLES[state.type];
  status.textContent = describe(total);
  grid.classList.toggle('is-empty', total === 0);
  empty.hidden = total > 0;
  if (total === 0) {
    const filterWords = [state.type && LABELS.type[state.type], state.industry && `for ${LABELS.industry[state.industry]}`].filter(Boolean).join(' ');
    emptyText.textContent = state.q
      ? `We couldn’t find anything matching “${state.q}”. Try a shorter search or a different filter, or subscribe below and we’ll let you know when something new is published.`
      : `We haven’t published ${filterWords ? `any ${filterWords}` : 'anything for this combination'} yet. Leave your email below and we’ll let you know as soon as it’s published.`;
  }
  more.hidden = total === 0;
  moreCount.textContent = `Showing ${shown.length} of ${total}`;
  moreBtn.hidden = shown.length >= total;
  if (sheetResults) sheetResults.textContent = `Show ${plural(total, 'result', 'results')}`;

  // Type tab counts reflect the other active filters
  $$('[data-count-for]', typeGroup).forEach((el) => {
    const n = items.filter((li) => li.dataset.type === el.dataset.countFor && matches(li, state, 'type')).length;
    el.textContent = ` · ${n}`;
  });

  syncControls();
  writeUrl();

  if (focusFrom >= 0 && shown[focusFrom]) shown[focusFrom].querySelector('a').focus({ preventScroll: false });
  firstRender = false;
}

function toggleFeatured(show, animate) {
  if (!featuredSection) return;
  const isShown = !featuredSection.hidden;
  if (show === isShown) return;
  gsap.killTweensOf(featuredSection);
  if (!animate || reduceMotion) {
    featuredSection.hidden = !show;
    return;
  }
  if (show) {
    featuredSection.hidden = false;
    gsap.from(featuredSection, { height: 0, paddingTop: 0, paddingBottom: 0, opacity: 0, duration: 0.6, ease: 'power3.inOut', clearProps: 'all' });
  } else {
    gsap.to(featuredSection, {
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      opacity: 0,
      duration: 0.5,
      ease: 'power3.inOut',
      onComplete: () => {
        featuredSection.hidden = true;
        gsap.set(featuredSection, { clearProps: 'all' });
        ScrollTrigger.refresh();
      },
    });
  }
}

function syncControls() {
  const press = (group, value) => $$('[data-value]', group).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
  press(typeGroup, state.type);
  $$('[data-filter-group="industry"], [data-sheet-group="industry"]').forEach((g) => press(g, state.industry));
  $$('[data-sheet-group="audience"]').forEach((g) => press(g, state.audience));
  $$('[data-sheet-group="stage"]').forEach((g) => press(g, state.stage));
  for (const [k, sel] of Object.entries(selects)) {
    sel.value = state[k];
    sel.closest('.pill-select').classList.toggle('is-active', Boolean(state[k]));
  }
  sortSelect.value = state.sort;
  if (searchInput.value !== state.q && document.activeElement !== searchInput) searchInput.value = state.q;
  searchClear.hidden = !searchInput.value;
  activeCount.textContent = ['industry', 'audience', 'stage'].filter((k) => state[k]).length;
  movePill();
}

function update(patch, opts) {
  state = { ...state, ...patch };
  visible = PAGE_SIZE;
  render(opts);
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
typeGroup.addEventListener('click', (e) => {
  const b = e.target.closest('[data-value]');
  if (b) update({ type: b.dataset.value });
});

$$('[data-filter-group="industry"], [data-sheet-group]').forEach((group) =>
  group.addEventListener('click', (e) => {
    const b = e.target.closest('[data-value]');
    if (!b) return;
    const key = group.dataset.filterGroup || group.dataset.sheetGroup;
    update({ [key]: b.dataset.value });
  }),
);

for (const [k, sel] of Object.entries(selects)) sel.addEventListener('change', () => update({ [k]: sel.value }));
sortSelect.addEventListener('change', () => update({ sort: sortSelect.value }));

let searchTimer;
searchInput.addEventListener('input', () => {
  searchClear.hidden = !searchInput.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => update({ q: searchInput.value.trim().slice(0, 80) }), 180);
});
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && searchInput.value) {
    e.stopPropagation();
    searchInput.value = '';
    update({ q: '' });
  }
});
searchClear.addEventListener('click', () => {
  searchInput.value = '';
  update({ q: '' });
  searchInput.focus();
});

moreBtn.addEventListener('click', () => {
  const from = visible;
  visible += PAGE_SIZE;
  render({ focusFrom: from });
});

const clearAll = () => {
  searchInput.value = '';
  update({ ...DEFAULTS, sort: state.sort });
};
$('[data-clear-all]').addEventListener('click', clearAll);
$('[data-clear-filters]').addEventListener('click', () => update({ industry: '', audience: '', stage: '' }));

// Mobile filters sheet (native <dialog>: focus trap + Esc for free)
$('[data-sheet-open]').addEventListener('click', () => {
  sheet.showModal();
  scrollLock(true);
});
$('[data-sheet-apply]').addEventListener('click', () => sheet.close());
sheet.addEventListener('click', (e) => e.target === sheet && sheet.close());
sheet.addEventListener('close', () => {
  scrollLock(false);
  if (!reduceMotion) gsap.fromTo('.res-results', { opacity: 0.4 }, { opacity: 1, duration: 0.5 });
});
matchMedia('(min-width: 901px)').addEventListener('change', (e) => e.matches && sheet.open && sheet.close());

// Sliding pill behind the selected format tab (desktop pill style only)
const pill = Object.assign(document.createElement('span'), { className: 'res-tabs__pill' });
pill.setAttribute('aria-hidden', 'true');
typeGroup.prepend(pill);
typeGroup.classList.add('has-pill');
let pillReady = false;
function movePill() {
  const tab = $('[aria-pressed="true"]', typeGroup);
  if (!tab) return;
  const vars = { x: tab.offsetLeft, width: tab.offsetWidth };
  if (!pillReady || reduceMotion) gsap.set(pill, vars);
  else gsap.to(pill, { ...vars, duration: 0.5, ease: 'expo.out' });
  pillReady = true;
}
addEventListener('resize', () => gsap.set(pill, { x: $('[aria-pressed="true"]', typeGroup)?.offsetLeft, width: $('[aria-pressed="true"]', typeGroup)?.offsetWidth }));
document.fonts?.ready.then(() => gsap.set(pill, { x: $('[aria-pressed="true"]', typeGroup).offsetLeft, width: $('[aria-pressed="true"]', typeGroup).offsetWidth }));

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
render({ animate: false });
initNewsletters();
splitHeadings();
magnetic();
cardsEnter('.rcard-item:not([hidden]) .rcard__link');

// ---------------------------------------------------------------------------
// Round 2 — immersive library hero, topic marquee, pinned editor's picks, generative covers
// ---------------------------------------------------------------------------
const hero = $('[data-res-hero]');
stage($('[data-library]'), library(), { scrub: true, trigger: hero, start: 'top top', end: 'bottom top', eager: true, stillTime: 6, antialias: false });
chars3D($('[data-chars]'), { delay: 0.35 });
scrambleIn();
liveClock();
velocityMarquee($('.vmq'), { speed: 70 });
tiltGlare('.rcard', { max: 7 });
tiltGlare('.feat__link', { max: 3, scale: 1 });
distortHover('.rcard__media', '.rcard');
distortHover('.rail-card__media', '.rail-card');
magnet('.res-hero__cta', 0.25);
paintCovers();

const picks = $('[data-picks]');
const track = $('[data-picks-track]');
const picksCount = $('[data-picks-count]');
const picksBar = $('[data-picks-bar]');
const railCards = $$('.rail-card', track);
$('[data-picks-total]').textContent = String(railCards.length).padStart(2, '0');

gsap.matchMedia().add(
  { desktop: '(min-width: 901px)', motion: '(prefers-reduced-motion: no-preference)' },
  ({ conditions: { desktop, motion } }) => {
    if (!motion) return;
    // hero copy drifts up and fades as the library opens
    gsap.to('.res-hero__content, .res-hero__side', { yPercent: -18, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.from('.res-hero__lines span', { scaleY: 0, transformOrigin: 'top', duration: 1.6, ease: 'expo.inOut', stagger: 0.08 });
    gsap.from('.res-index li', { x: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, delay: 0.6 });
    if (!desktop) return;
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: picks,
        start: 'top top',
        end: () => `+=${dist()}`,
        pin: true,
        pinSpacing: true, // main is a flex column: ScrollTrigger would default to false
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (st) => {
          picksBar.style.transform = `scaleX(${0.16 + st.progress * 0.84})`;
          picksCount.textContent = String(Math.min(railCards.length, 1 + Math.round(st.progress * (railCards.length - 1)))).padStart(2, '0');
        },
      },
    });
    // each card swings in from depth as it travels across the viewport
    railCards.forEach((card) =>
      gsap.fromTo(
        card.querySelector('.rail-card__media'),
        { rotationY: -18, scale: 0.9, transformPerspective: 1200 },
        { rotationY: 12, scale: 1, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } },
      ),
    );
  },
);
