import { initSite, gsap, ScrollTrigger, reduceMotion, lenis } from '../../ds/site.js';
import { autoMount3D } from '../../ds/fx3d.js';
import { Flip } from 'gsap/Flip';
import { validateApplication } from '../../lib/application-validation.js';
import { $, $$, splitHeadings, magnetic, refreshPosted } from './motion.js';
import { createCvUpload, fileToBase64 } from './cv-upload.js';
import { setFieldError, formValues, lockForm, postJson, sendErrorText } from './form-utils.js';
import { stage, particles } from '../resources/gl-kit.js';
import { chars3D, liveClock, velocityMarquee, finePointer, confetti } from '../resources/fx-dom.js';
import './careers.css';

gsap.registerPlugin(Flip);
initSite();
autoMount3D();
magnetic();
refreshPosted();

const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  splitHeadings();
  gsap.from('.filters, .jobs-head', { y: 24, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.car-list', start: 'top 85%' } });
  gsap.from('.job', { y: 28, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '[data-jobs]', start: 'top 88%' } });
});

const scrollToEl = (el, offset = -120) => (lenis ? lenis.scrollTo(el, { offset, duration: reduceMotion ? 0 : 1 }) : el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }));

// ===========================================================================
// Filters, search, sort, expandable rows — all reflected in the URL
//   /careers/?q=ads&area=Media,Data&type=Full-time&location=…&sort=az&role=<slug>
// ===========================================================================
const list = $('[data-jobs]');
const rows = $$('.job', list);
const filters = $('[data-filters]');
const chips = $$('.chip[data-group]', filters);
const countEl = $('[data-result-count]');
const emptyEl = $('[data-jobs-empty]');
const sortEl = $('[data-sort]');
const clearBtn = $('[data-clear]');
const search = $('#role-search');
const queryChip = $('[data-query-chip]');
const cta = $('[data-cta-role]');
const GROUPS = ['area', 'type', 'location'];

const state = { q: '', area: new Set(), type: new Set(), location: new Set(), sort: 'newest', open: '' };

const jobOf = (row) => ({ slug: row.dataset.slug, title: row.dataset.title, area: row.dataset.area, type: row.dataset.type, location: row.dataset.location, postedAt: row.dataset.postedAt, keywords: row.dataset.keywords });
const JOBS = rows.map(jobOf);
const terms = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
const matchQuery = (job, q) => terms(q).every((t) => job.keywords.includes(t));
const matches = (job, s, skip) => (!s.q || matchQuery(job, s.q)) && GROUPS.every((g) => g === skip || !s[g].size || s[g].has(job[g]));

function readUrl() {
  const p = new URLSearchParams(location.search);
  state.q = (p.get('q') || '').slice(0, 80);
  GROUPS.forEach((g) => (state[g] = new Set((p.get(g) || '').split(',').filter((v) => JOBS.some((j) => j[g] === v) || chips.some((c) => c.dataset.group === g && c.dataset.value === v)))));
  state.sort = ['newest', 'oldest', 'az'].includes(p.get('sort')) ? p.get('sort') : 'newest';
  state.open = JOBS.some((j) => j.slug === p.get('role')) ? p.get('role') : '';
}
function writeUrl() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  GROUPS.forEach((g) => state[g].size && p.set(g, [...state[g]].join(',')));
  if (state.sort !== 'newest') p.set('sort', state.sort);
  if (state.open) p.set('role', state.open);
  const qs = p.toString();
  history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
}

function renderChips() {
  chips.forEach((c) => {
    const g = c.dataset.group;
    const v = c.dataset.value;
    const pressed = v === 'all' ? state[g].size === 0 : state[g].has(v);
    c.setAttribute('aria-pressed', String(pressed));
    const n = v === 'all' ? JOBS.filter((j) => matches(j, state, g)).length : JOBS.filter((j) => matches(j, { ...state, [g]: new Set([v]) })).length;
    $('.chip__count', c).textContent = n;
    if (n === 0 && !pressed) {
      c.setAttribute('aria-disabled', 'true');
      c.title = 'No roles right now';
    } else {
      c.removeAttribute('aria-disabled');
      c.removeAttribute('title');
    }
  });
}

function apply({ animate = true } = {}) {
  const flip = animate && !reduceMotion ? Flip.getState(rows) : null;
  const visible = JOBS.filter((j) => matches(j, state));
  rows.forEach((row, i) => (row.hidden = !visible.includes(JOBS[i])));
  // sort (DOM order = visual order = reading order)
  const order = [...rows].sort((a, b) => {
    const A = jobOf(a);
    const B = jobOf(b);
    if (state.sort === 'az') return A.title.localeCompare(B.title);
    return state.sort === 'oldest' ? A.postedAt.localeCompare(B.postedAt) : B.postedAt.localeCompare(A.postedAt);
  });
  order.forEach((r) => list.append(r));
  if (state.open && !visible.some((j) => j.slug === state.open)) setOpen('', false);

  const n = visible.length;
  countEl.textContent = `Showing ${n} of ${JOBS.length} roles${state.q ? ` for "${state.q}"` : ''}`;
  emptyEl.hidden = n > 0;
  if (!n) $('[data-empty-text]', emptyEl).textContent = state.q ? `No roles match "${state.q}" yet.` : 'No roles match these filters yet.';
  queryChip.hidden = !state.q;
  $('[data-query-text]', queryChip).textContent = `"${state.q}"`;
  clearBtn.disabled = !state.q && GROUPS.every((g) => !state[g].size) && state.sort === 'newest';
  sortEl.value = state.sort;
  renderChips();
  writeUrl();
  document.dispatchEvent(new CustomEvent('careers:filter', { detail: { slugs: visible.map((j) => j.slug) } }));
  if (flip)
    Flip.from(flip, {
      duration: 0.5,
      ease: 'power3.inOut',
      absolute: false,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }),
      onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.2 }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  else ScrollTrigger.refresh();
}

filters.addEventListener('click', (e) => {
  const c = e.target.closest('.chip[data-group]');
  if (!c || c.getAttribute('aria-disabled') === 'true') return;
  const g = c.dataset.group;
  const v = c.dataset.value;
  if (v === 'all') state[g].clear();
  else if (state[g].has(v)) state[g].delete(v);
  else state[g].add(v);
  apply();
  prefillArea();
});
sortEl.addEventListener('change', () => ((state.sort = sortEl.value), apply()));
clearBtn.addEventListener('click', () => {
  state.q = '';
  search.value = '';
  GROUPS.forEach((g) => state[g].clear());
  state.sort = 'newest';
  apply();
  search.focus({ preventScroll: true });
});
$('[data-query-clear]').addEventListener('click', () => {
  state.q = '';
  search.value = '';
  apply();
  search.focus({ preventScroll: true });
});

// ---------------------------------------------------------------------------
// Expandable preview (one open at a time). Title = real link (Cmd/Ctrl-click opens the role).
// ---------------------------------------------------------------------------
function setOpen(slug, animate = true) {
  rows.forEach((row) => {
    const btn = $('.job__toggle', row);
    const panel = $('.job__panel', row);
    const open = row.dataset.slug === slug;
    const was = btn.getAttribute('aria-expanded') === 'true';
    if (open === was) return;
    btn.setAttribute('aria-expanded', String(open));
    row.classList.toggle('is-open', open);
    if (open) {
      panel.hidden = false;
      if (animate && !reduceMotion) gsap.fromTo(panel, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'height,opacity', onComplete: () => ScrollTrigger.refresh() });
    } else if (animate && !reduceMotion) gsap.to(panel, { height: 0, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => ((panel.hidden = true), gsap.set(panel, { clearProps: 'height,opacity' }), ScrollTrigger.refresh()) });
    else panel.hidden = true;
  });
  state.open = slug;
  // CTA 05 follows the expanded role
  const job = JOBS.find((j) => j.slug === slug);
  $('[data-cta-label]', cta).textContent = job ? `View ${job.title} role` : 'See all roles';
  cta.href = job ? `/careers/${job.slug}/` : '#open-roles';
  writeUrl();
}
list.addEventListener('click', (e) => {
  const toggle = e.target.closest('.job__toggle');
  const link = e.target.closest('[data-expand]');
  if (link && (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)) return;
  if (!toggle && !link) return;
  e.preventDefault();
  const slug = e.target.closest('.job').dataset.slug;
  setOpen(state.open === slug ? '' : slug);
});

// ---------------------------------------------------------------------------
// Live search: combobox with up to 5 suggestions ("/" focuses it)
// ---------------------------------------------------------------------------
const pop = $('#role-suggest-pop');
const listbox = $('#role-suggest');
const foot = $('[data-suggest-foot]');
let active = -1;
let debounce;
const closePop = () => {
  pop.hidden = true;
  search.setAttribute('aria-expanded', 'false');
  search.removeAttribute('aria-activedescendant');
  active = -1;
};
function suggest() {
  const q = search.value.trim();
  if (!q) return closePop();
  const hits = JOBS.filter((j) => matchQuery(j, q));
  listbox.innerHTML = hits
    .slice(0, 5)
    .map((j, i) => `<li class="search__opt" role="option" id="opt-${j.slug}" aria-selected="false" data-slug="${j.slug}" data-i="${i}"><span>${j.title.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</span><small>${j.area} · ${j.type}</small></li>`)
    .join('');
  foot.textContent = hits.length ? `${hits.length} role${hits.length > 1 ? 's' : ''} · Enter to see results` : `No roles match "${q}" yet.`;
  pop.hidden = false;
  search.setAttribute('aria-expanded', 'true');
  active = -1;
}
const highlight = (i) => {
  const opts = $$('[role="option"]', listbox);
  if (!opts.length) return;
  active = (i + opts.length) % opts.length;
  opts.forEach((o, k) => o.setAttribute('aria-selected', String(k === active)));
  search.setAttribute('aria-activedescendant', opts[active].id);
};
const goToRole = (slug) => {
  closePop();
  setOpen(slug);
  const row = $(`.job[data-slug="${slug}"]`);
  if (row) scrollToEl(row, -140);
};
search.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    state.q = search.value.trim().slice(0, 80);
    apply();
    suggest();
  }, 150);
});
search.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') (e.preventDefault(), pop.hidden ? suggest() : highlight(active + 1));
  else if (e.key === 'ArrowUp') (e.preventDefault(), highlight(active - 1));
  else if (e.key === 'Escape') closePop();
  else if (e.key === 'Enter') {
    e.preventDefault();
    clearTimeout(debounce);
    state.q = search.value.trim().slice(0, 80);
    apply();
    const opt = active >= 0 ? $$('[role="option"]', listbox)[active] : null;
    if (opt) return goToRole(opt.dataset.slug);
    closePop();
    scrollToEl($('#open-roles'), -100);
  }
});
search.addEventListener('blur', () => setTimeout(closePop, 150));
listbox.addEventListener('mousedown', (e) => {
  const opt = e.target.closest('[role="option"]');
  if (opt) (e.preventDefault(), goToRole(opt.dataset.slug));
});
addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t.closest?.('input, textarea, select, [contenteditable="true"]')) return;
  e.preventDefault();
  search.focus();
});
if (matchMedia('(max-width: 900px)').matches) search.addEventListener('focus', () => scrollToEl(search, -100));

// Initial state from the URL
readUrl();
search.value = state.q;
apply({ animate: false });
if (state.open) setOpen(state.open, false);

// ===========================================================================
// 04 · Send us your CV anyway (open application → POST /api/apply, kind "open")
// ===========================================================================
const form = $('[data-cv-form]');
const done = $('[data-cv-done]');
const netBanner = $('[data-banner-network]', form);
const touched = new Set();
const cv = createCvUpload($('[data-field="cv"]', form), {
  setError: (msg) => setFieldError(form, 'cv', msg),
  onChange: () => touched.add('cv'),
});
function prefillArea() {
  const sel = form.elements.area;
  if (state.area.size === 1 && !sel.value) sel.value = [...state.area][0];
}
prefillArea();

const check = (only) => {
  const { values, errors } = validateApplication(formValues(form), { kind: 'open' });
  const cvErr = cv.validate();
  if (cvErr) errors.cv = cvErr;
  ['name', 'email', 'area', 'link', 'consent', 'cv'].forEach((k) => (!only || only === k) && setFieldError(form, k, touched.has(k) || !only ? errors[k] || '' : ''));
  return { values, errors };
};
form.addEventListener('focusout', (e) => {
  const name = e.target.name;
  if (!name || name === 'cv' || name === 'botField') return;
  touched.add(name);
  check(name);
});
form.addEventListener('input', (e) => touched.has(e.target.name) && check(e.target.name));
form.addEventListener('change', (e) => e.target.type === 'checkbox' && (touched.add(e.target.name), check(e.target.name)));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  netBanner.hidden = true;
  ['name', 'email', 'area', 'link', 'consent', 'cv'].forEach((k) => touched.add(k));
  const { values, errors } = check();
  const first = Object.keys(errors)[0];
  if (first) {
    const field = $(`[data-field="${first}"]`, form);
    $('input, select, textarea', field)?.focus();
    return;
  }
  const btnLabel = $('[data-submit-label]', form);
  btnLabel.textContent = 'Sending…';
  let payload;
  try {
    payload = { kind: 'open', ...values, consent: true, botField: form.elements.botField.value, cv: { name: cv.file.name, size: cv.file.size, type: cv.file.type, data: await fileToBase64(cv.file) } };
  } catch {
    btnLabel.textContent = 'Send my CV';
    return setFieldError(form, 'cv', 'We couldn’t read this file. Try another copy of your CV.');
  }
  lockForm(form, true);
  const r = await postJson('/api/apply', payload);
  lockForm(form, false);
  btnLabel.textContent = 'Send my CV';
  if (r.ok) {
    const firstName = values.name.split(' ')[0];
    $('[data-cv-done-title]', done).textContent = `Thanks, ${firstName}. Your CV is in.`;
    form.hidden = true;
    done.hidden = false;
    if (!reduceMotion) gsap.from(done.children, { opacity: 0, y: 14, rotationX: -20, duration: 0.6, stagger: 0.07, ease: 'expo.out' });
    done.focus();
    confetti(done);
    return;
  }
  if (r.error === 'validation' && r.fields) {
    Object.entries(r.fields).forEach(([k, v]) => setFieldError(form, k, v));
    return $('[aria-invalid="true"]', form)?.focus();
  }
  $('[data-network-text]', netBanner).textContent = sendErrorText(r);
  netBanner.hidden = false;
  netBanner.focus();
});

// ===========================================================================
// Round 2 — particle hero, floating 3D job board synced with the filters, area marquee
// ===========================================================================
chars3D($('[data-chars]'), { delay: 0.3 });
liveClock();

stage(
  $('[data-particles]'),
  particles(['scatter', 'logo', 'plane'], {
    count: 6000,
    offsetX: 3.2,
    mobileScale: 0.6,
    mobileY: 1.4,
    onUpdate: (t, c, { camera }) => (camera.position.z = 11 + c.progress * 5),
  }),
  {
    eager: true,
    scrub: true,
    trigger: '.car-hero',
    start: 'top top',
    end: 'bottom top',
    stillTime: 3,
    onReady: (api) => {
      api.set('shape', reduceMotion ? 1 : 0);
      if (reduceMotion) return api.redraw();
      setTimeout(() => api.set('shape', 1), 400);
      // the isologo dissolves into a "board" once the role cards have flown in
      setTimeout(() => api.set('shape', 2), 3200);
      document.addEventListener('careers:filter', () => {
        api.set('burst', 1);
        setTimeout(() => api.set('burst', 0), 450);
      });
      search.addEventListener('input', () => {
        api.set('burst', 0.5);
        clearTimeout(search._b);
        search._b = setTimeout(() => api.set('burst', 0), 300);
      });
    },
  },
);

// marquee words from the live role list (areas + locations)
const mq = $('[data-roles-marquee]');
if (mq) {
  const words = ['Open roles', ...new Set(JOBS.map((j) => j.area)), 'Remote', ...new Set(JOBS.map((j) => j.type))];
  $('.vmq__track', mq).innerHTML = words.map((w, i) => `<span class="vmq__word${i % 3 === 0 ? ' is-solid' : ''}">${w.replace(/[&<>]/g, '')}</span><span class="vmq__star">✳</span>`).join('');
  velocityMarquee(mq, { speed: 60 });
}

// floating board: one glass card per role; filters bring matches forward and sink the rest
const board = $('[data-board]');
if (board) {
  const stageEl = document.createElement('div');
  stageEl.className = 'car-board__stage';
  board.append(stageEl);
  const cards = JOBS.map((j, i) => {
    const el = document.createElement('div');
    el.className = 'board-card';
    el.innerHTML = `<span class="board-card__top"><span class="board-card__area"></span><span>No. ${String(i + 1).padStart(2, '0')}</span></span><span class="board-card__title"></span><span class="board-card__meta"><span></span><span></span></span>`;
    $('.board-card__area', el).textContent = j.area;
    $('.board-card__title', el).textContent = j.title;
    const [a, b] = $$('.board-card__meta span', el);
    a.textContent = j.type;
    b.textContent = j.location;
    stageEl.append(el);
    return { el, slug: j.slug };
  });
  const layout = (slugs, animate) => {
    const on = cards.filter((c) => slugs.includes(c.slug));
    const m = on.length;
    cards.forEach((c) => {
      const k = on.indexOf(c);
      c.el.classList.toggle('is-match', k >= 0 && m < cards.length);
      const vars =
        k >= 0
          ? { x: (k - (m - 1) / 2) * 46, y: (k - (m - 1) / 2) * 92, z: -k * 70 + (m - 1) * 20, rotationY: -24, rotationX: 12, rotationZ: -3, opacity: 1 }
          : { x: 120, y: 220, z: -700, rotationY: -40, rotationX: 30, rotationZ: 0, opacity: 0.08 };
      if (animate && !reduceMotion) gsap.to(c.el, { ...vars, duration: 1.1, ease: 'expo.out', delay: Math.max(0, k) * 0.05 });
      else gsap.set(c.el, vars);
    });
  };
  // fly in from deep space on load
  if (!reduceMotion) {
    cards.forEach((c, i) => gsap.set(c.el, { x: 400, y: -300 + i * 120, z: -1400, rotationY: -80, opacity: 0 }));
    setTimeout(() => layout(JOBS.filter((j) => matches(j, state)).map((j) => j.slug), true), 500);
  } else layout(JOBS.filter((j) => matches(j, state)).map((j) => j.slug), false);
  document.addEventListener('careers:filter', (e) => layout(e.detail.slugs, true));
  if (finePointer()) {
    const rx = gsap.quickTo(stageEl, 'rotationX', { duration: 1, ease: 'power3' });
    const ry = gsap.quickTo(stageEl, 'rotationY', { duration: 1, ease: 'power3' });
    addEventListener('pointermove', (e) => {
      ry((e.clientX / innerWidth - 0.5) * 16);
      rx(-(e.clientY / innerHeight - 0.5) * 10);
    });
  }
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.to(stageEl, { y: -14, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(board, { yPercent: -25, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.car-hero', start: 'top top', end: 'bottom top', scrub: true } });
  });
}

mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.from('.car-hero__hud', { opacity: 0, y: -10, duration: 1, delay: 0.6 });
});
