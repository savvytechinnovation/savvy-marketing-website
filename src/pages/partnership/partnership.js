import { initSite, gsap, reduceMotion } from '../../ds/site.js';
import { mount3D } from '../../ds/fx3d.js';
import { SplitText } from 'gsap/SplitText';
import {
  INDUSTRIES, STAGES, INVESTMENTS, ROLES, SERVE, GOAL_SUGGESTIONS, CHALLENGES, MARKETING, SOURCES, BEST_TIMES, FORMATS,
  INDUSTRY_QUESTIONS, FIELD_STEP, validatePartnership, firstErrorStep, fitMatrix,
} from '../../lib/partnership-validation.js';
import { KEYS, load, save, remove, escapeHtml, postJson, failureMessage } from '../fit-check/store.js';
import { buildSlots, slotLabel, tzOptions, gcalUrl, icsFile } from './calendar.js';
import './partnership.css';

gsap.registerPlugin(SplitText);
initSite({ smooth: false });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const form = $('[data-ep-form]');
const params = new URLSearchParams(location.search);
const industryLabel = (v) => INDUSTRIES.find((i) => i.value === v)?.label ?? '';

// ---------------------------------------------------------------------------
// Render option groups from the shared module (single source of truth)
// ---------------------------------------------------------------------------
const pill = (type, name, value, label, extra = '') =>
  `<label class="pill"><input type="${type}" name="${name}" value="${escapeHtml(value)}" ${extra} /><span>${escapeHtml(label)}</span></label>`;
$('[data-industries]').innerHTML = INDUSTRIES.map((o) => pill('radio', 'industry', o.value, o.label)).join('');
$('[data-roles]').innerHTML = ROLES.map((r) => pill('radio', 'role', r, r)).join('');
$('[data-stages]').innerHTML = STAGES.map(
  (s) => `<label class="stage"><input type="radio" name="stage" value="${s.value}" /><span><span class="t-label-md">${s.label}</span><span class="t-p-sm c-sub">${s.hint}</span></span></label>`,
).join('');
$('[data-goal-suggestions]').innerHTML = GOAL_SUGGESTIONS.map((g) => `<button type="button" class="suggest__chip" data-suggest="${escapeHtml(g)}">+ ${escapeHtml(g)}</button>`).join('');
$('[data-challenges]').innerHTML = CHALLENGES.map((c) => pill('checkbox', 'challenges', c, c)).join('');
$('[data-marketing]').innerHTML = MARKETING.map((m) => pill('checkbox', 'marketing', m, m)).join('');
$('[data-investments]').innerHTML = INVESTMENTS.map((o) => pill('radio', 'investment', o.value, o.label)).join('');
$('#f-source').insertAdjacentHTML('beforeend', SOURCES.map((s) => `<option>${escapeHtml(s)}</option>`).join(''));
$('[data-best-times]').innerHTML = BEST_TIMES.map((b) => pill('checkbox', 'bestTimes', b, b)).join('');
$('[data-formats]').innerHTML = FORMATS.map((f) => pill('radio', 'format', f.value, f.label)).join('');

function renderServe(industry) {
  const current = form.elements.serve?.value;
  $('[data-serve]').innerHTML = SERVE.filter((s) => !s.industry || s.industry === industry).map((s) => pill('radio', 'serve', s.value, s.label)).join('');
  if (current) setValue('serve', current);
  $('[data-serve-hint]').hidden = industry !== 'cleaning';
}
function renderIndustryQuestions(industry) {
  const qs = INDUSTRY_QUESTIONS[industry] || [];
  const box = $('[data-iq]');
  box.hidden = !qs.length;
  const prev = readIndustryAnswers();
  $('[data-iq-title]').textContent = `For ${industryLabel(industry)} companies`;
  $('[data-iq-fields]').innerHTML = qs
    .map(
      (q) => `<div class="field"><label class="field__label" for="iq-${q.id}">${escapeHtml(q.label)}</label>
        <select class="select" id="iq-${q.id}" name="iq_${q.id}"><option value="">Select…</option>${q.options.map((o) => `<option ${prev[q.id] === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}</select></div>`,
    )
    .join('');
}
const readIndustryAnswers = () => Object.fromEntries($$('[name^="iq_"]', form).filter((s) => s.value).map((s) => [s.name.slice(3), s.value]));

// ---------------------------------------------------------------------------
// Read / write form values
// ---------------------------------------------------------------------------
let noTimes = false;
let calendarState = { offset: 0, day: '' };

function read() {
  const fd = new FormData(form);
  return {
    name: fd.get('name') || '',
    company: fd.get('company') || '',
    email: fd.get('email') || '',
    phone: fd.get('phone') || '',
    website: fd.get('website') || '',
    noWebsite: form.elements.noWebsite.checked,
    industry: fd.get('industry') || '',
    role: fd.get('role') || '',
    serve: fd.get('serve') || '',
    stage: fd.get('stage') || '',
    goals: fd.get('goals') || '',
    challenges: fd.getAll('challenges'),
    challengeOther: fd.get('challengeOther') || '',
    marketing: fd.getAll('marketing'),
    marketingNotes: fd.get('marketingNotes') || '',
    investment: fd.get('investment') || '',
    industryAnswers: readIndustryAnswers(),
    source: fd.get('source') || '',
    smsConsent: form.elements.smsConsent.checked,
    slot: fd.get('slot') || '',
    format: fd.get('format') || '',
    noTimes,
    bestTimes: fd.getAll('bestTimes'),
    timezone: fd.get('timezone') || '',
    botField: fd.get('botField') || '',
  };
}

function setValue(name, value) {
  const el = form.elements[name];
  if (!el) return;
  if (el instanceof RadioNodeList) {
    const list = [...el];
    list.forEach((i) => {
      if (i.type === 'checkbox') i.checked = Array.isArray(value) && value.includes(i.value);
      else if (i.type === 'radio') i.checked = i.value === value;
      else i.value = value ?? '';
    });
  } else if (el.type === 'checkbox') el.checked = Array.isArray(value) ? value.includes(el.value) : Boolean(value);
  else if (el.type === 'radio') el.checked = el.value === value;
  else el.value = value ?? '';
}

function fill(v) {
  for (const k of ['name', 'company', 'email', 'phone', 'website', 'industry', 'role', 'stage', 'goals', 'challengeOther', 'marketingNotes', 'investment', 'source', 'format', 'timezone']) if (v[k] != null) setValue(k, v[k]);
  for (const k of ['challenges', 'marketing', 'bestTimes']) if (Array.isArray(v[k])) setValue(k, v[k]);
  form.elements.noWebsite.checked = Boolean(v.noWebsite);
  form.elements.smsConsent.checked = Boolean(v.smsConsent);
  renderServe(v.industry);
  if (v.serve) setValue('serve', v.serve);
  renderIndustryQuestions(v.industry);
  for (const [k, val] of Object.entries(v.industryAnswers || {})) if (form.elements[`iq_${k}`]) form.elements[`iq_${k}`].value = val;
  noTimes = Boolean(v.noTimes);
  syncDependent();
}

// ---------------------------------------------------------------------------
// Draft autosave (sessionStorage) + prefill from ?industry / ?from / UTM / fit profile
// ---------------------------------------------------------------------------
const draft = load(KEYS.draft, null);
const tracking = {};
for (const k of ['from', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) if (params.get(k)) tracking[k] = params.get(k).slice(0, 200);
tracking.page = location.pathname;
if (draft?.tracking) Object.assign(tracking, draft.tracking, Object.fromEntries(Object.entries(tracking).filter(([k]) => k !== 'page')));

let step = 0; // 0 intro · 1–3 form · 'done' · 'not-yet'
let returnToReview = false;
let savedTimer;
const savedEl = $('[data-saved]');
function persist() {
  const v = read();
  delete v.botField;
  save(KEYS.draft, { values: v, step: typeof step === 'number' ? step : 3, tracking, savedAt: Date.now() });
  savedEl.classList.add('is-pulse');
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => savedEl.classList.remove('is-pulse'), 900);
}

renderServe('');
const tzSelect = $('[data-tz]');
tzSelect.innerHTML = tzOptions().map((o) => `<option value="${o.value}">${escapeHtml(o.label)}</option>`).join('');

if (draft?.values) fill(draft.values);
else {
  // Prefill industry from ?industry= (industry pages) or the fit check profile
  const profile = load(KEYS.profile, {});
  const ind = (params.get('industry') || profile.industry || '').toLowerCase();
  if (INDUSTRIES.some((i) => i.value === ind)) {
    setValue('industry', ind);
    renderServe(ind);
    renderIndustryQuestions(ind);
    const note = $('[data-prefill-note]');
    note.hidden = false;
    note.textContent = params.get('industry')
      ? `Pre-selected because you came from our ${industryLabel(ind)} page. Change it anytime.`
      : 'Pre-selected from your fit check. Change it anytime.';
  }
  if (profile.stage) setValue('stage', profile.stage);
  if (profile.investment) setValue('investment', profile.investment);
  if (profile.stage || profile.investment) $('[data-profile-note]').hidden = false;
  // How did you hear about us? — pre-set from the link
  const from = (tracking.from || '').toLowerCase();
  const utm = (tracking.utm_source || '').toLowerCase();
  const src = /fit/.test(from) ? 'Fit check' : /google|bing/.test(utm) ? 'Google search' : /facebook|instagram|linkedin|meta|social/.test(utm) ? 'Social media' : /mail/.test(utm) ? 'Email' : /referr/.test(utm) ? 'Referral' : '';
  if (src) {
    setValue('source', src);
    $('[data-source-hint]').hidden = false;
  }
}
if (!form.elements.timezone.value) setValue('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
if (!tzSelect.value) tzSelect.selectedIndex = 0;

// ---------------------------------------------------------------------------
// Validation UI: on blur + on continue/submit; aria-invalid + aria-describedby errors
// ---------------------------------------------------------------------------
const touched = new Set();
const GROUPS = ['industry', 'role', 'serve', 'stage', 'challenges', 'investment', 'bestTimes', 'slot', 'format'];

function setError(name, msg) {
  const err = document.getElementById(`err-${name}`);
  if (err) err.textContent = msg || '';
  if (GROUPS.includes(name)) {
    const group = $(`[data-group="${name}"]`);
    group?.classList.toggle('has-error', Boolean(msg));
    $$(`[name="${name}"]`, form).forEach((i) => i.setAttribute('aria-invalid', msg ? 'true' : 'false'));
  } else {
    const el = form.elements[name];
    if (el?.setAttribute) {
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      el.closest('.field')?.classList.toggle('has-error', Boolean(msg));
    }
  }
}

function showErrors(errors, stepNo) {
  const names = Object.keys(FIELD_STEP).filter((k) => FIELD_STEP[k] === stepNo);
  names.forEach((n) => setError(n, errors[n]));
}

function focusField(name) {
  const el = GROUPS.includes(name) ? $(`[name="${name}"]`, form) : form.elements[name];
  el?.focus({ preventScroll: true });
  (el?.closest('.field, .group, .slots') || el)?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
}

const live = $('[data-ep-live]');
function validateStep(n, { focus = true } = {}) {
  const { errors, outcome } = validatePartnership(read(), { steps: [n] });
  showErrors(errors, n);
  const keys = Object.keys(errors).filter((k) => FIELD_STEP[k] === n);
  if (keys.length && focus) {
    // first error in DOM order
    const order = Object.keys(FIELD_STEP).filter((k) => FIELD_STEP[k] === n);
    const first = order.find((k) => errors[k]);
    live.textContent = `${keys.length} field${keys.length === 1 ? ' needs' : 's need'} attention.`;
    focusField(first);
  }
  return { ok: !keys.length, outcome };
}

form.addEventListener('focusout', (e) => {
  const name = e.target.name;
  if (!name || !(name in FIELD_STEP) || GROUPS.includes(name)) return;
  if (!e.target.value && !touched.has(name)) return;
  touched.add(name);
  const { errors } = validatePartnership(read(), { steps: [FIELD_STEP[name]] });
  setError(name, errors[name]);
});
form.addEventListener('input', (e) => {
  const name = e.target.name;
  if (touched.has(name) || e.target.getAttribute('aria-invalid') === 'true') {
    const { errors } = validatePartnership(read(), { steps: [FIELD_STEP[name] || 1] });
    setError(name, errors[name]);
  }
  persist();
});
form.addEventListener('change', (e) => {
  const name = e.target.name;
  if (name === 'industry') {
    renderServe(e.target.value);
    renderIndustryQuestions(e.target.value);
  }
  if (GROUPS.includes(name) && $(`[data-group="${name}"]`)?.classList.contains('has-error')) {
    const { errors } = validatePartnership(read(), { steps: [FIELD_STEP[name]] });
    setError(name, errors[name]);
  }
  if (name === 'timezone') renderCalendar();
  if (name === 'slot' || name === 'format') updateBar();
  syncDependent();
  persist();
});

function syncDependent() {
  const v = read();
  $('[data-challenge-other]').hidden = !v.challenges.includes('Other');
  const site = form.elements.website;
  site.disabled = v.noWebsite;
  if (v.noWebsite) setError('website', '');
  $('[data-sms-phone]').textContent = v.phone.trim() || 'my phone';
}

// Goal suggestions append to the textarea
$('[data-goal-suggestions]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-suggest]');
  if (!b) return;
  const ta = form.elements.goals;
  const s = b.dataset.suggest;
  ta.value = ta.value.trim() ? `${ta.value.trim().replace(/[.]?$/, '.')} ${s}.` : `${s}.`;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  b.classList.add('is-used');
  ta.focus();
});

// ---------------------------------------------------------------------------
// Views & steps (animated, reduced-motion aware)
// ---------------------------------------------------------------------------
const body = document.body;
const sides = $$('[data-side]');
const fillBar = $('[data-stepper-fill]');

function setSide(name) {
  sides.forEach((s) => (s.hidden = s.dataset.side !== name));
}
function setStepper(n) {
  $$('[data-stepper]').forEach((li) => {
    const k = Number(li.dataset.stepper);
    li.classList.toggle('is-done', typeof n === 'number' && k < n);
    li.classList.toggle('is-current', k === n);
    li.toggleAttribute('aria-current', k === n);
    if (k === n) li.setAttribute('aria-current', 'step');
    $('[data-stepper-state]', li).textContent = k < n ? ', completed' : k === n ? ', current step' : '';
    $('.ep-steps__n span', li).textContent = k < n ? '✓' : String(k);
  });
  fillBar.style.scale = `${typeof n === 'number' ? Math.max(0, (n - 1) / 2) : 1} 1`;
  $$('[data-wn]').forEach((li) => li.classList.toggle('is-current', Number(li.dataset.wn) === n));
}

function animateIn(el) {
  if (reduceMotion || !el) return;
  // opacity (not autoAlpha) so the focused step title keeps keyboard focus while it animates in
  gsap.fromTo(el, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', clearProps: 'transform,opacity' });
  gsap.fromTo($$(':scope > *', el).slice(0, 8), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.04, ease: 'power2.out', delay: 0.05, clearProps: 'transform,opacity' });
}

function showView(name) {
  body.dataset.view = name;
  $$('[data-view-panel]').forEach((p) => (p.hidden = p.dataset.viewPanel !== name));
  form.hidden = name !== 'form';
}

let outcome = null;
function goStep(n, { focus = true } = {}) {
  step = n;
  showView('form');
  $$('.ep-step', form).forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
  setStepper(n);
  setSide(n === 3 ? 'call' : 'form');
  $('[data-back]').hidden = false;
  const label = $('[data-next-label]');
  label.textContent = n === 3 ? (noTimes ? 'Send my times' : 'Confirm booking') : returnToReview ? 'Save and return to review' : 'Continue';
  $('[data-saved]').hidden = n === 3;
  hideAlert();
  if (n === 3) prepareStep3();
  updateBar();
  persist();
  const cur = $(`.ep-step[data-step="${n}"]`, form);
  animateIn(cur);
  if (focus) {
    $('.ep-step__title', cur).focus({ preventScroll: true });
    scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
}

function start() {
  goStep(1);
}
$('[data-start]').addEventListener('click', start);

// Resume (Flow C · Resume)
if (draft?.values && (draft.step || 0) >= 1) {
  const r = $('[data-resume]');
  r.hidden = false;
  const first = String(draft.values.name || '').trim().split(/\s+/)[0];
  $('[data-resume-name]').textContent = first ? `, ${first}` : '';
  $('[data-resume-go]').addEventListener('click', () => {
    const v = read();
    const s1 = validatePartnership(v, { steps: [1] }).errors;
    const s2 = validatePartnership(v, { steps: [2] }).errors;
    goStep(Object.keys(s1).length ? 1 : Object.keys(s2).length ? 2 : Math.min(draft.step, 3));
  });
  $('[data-resume-reset]').addEventListener('click', () => {
    remove(KEYS.draft);
    location.replace(location.pathname + location.search);
  });
}

$('[data-back]').addEventListener('click', () => {
  if (step === 1) {
    showView('intro');
    setSide('intro');
    setStepper(0);
    animateIn($('.ep-intro'));
    return;
  }
  if (noTimes && step === 3) return toggleNoTimes(false);
  returnToReview = false;
  goStep(step - 1);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (form.classList.contains('is-sending')) return;
  if (step === 1 || step === 2) {
    const { ok } = validateStep(step);
    if (!ok) return;
    if (returnToReview) {
      const all = validatePartnership(read(), { steps: [1, 2] });
      const firstStep = firstErrorStep(all.errors);
      if (firstStep) return goStep(firstStep);
      returnToReview = false;
      return routeAfterStep2();
    }
    if (step === 1) return goStep(2);
    return routeAfterStep2();
  }
  if (step === 3) submit();
});

// Fit check (stage × investment) runs instantly on Continue
function routeAfterStep2() {
  const v = read();
  outcome = fitMatrix(v.stage, v.investment);
  if (outcome === 'not-yet') return showNotYet();
  goStep(3);
}

// ---------------------------------------------------------------------------
// Step 3: calendar (fit = 45–60 min consultation, soft = 30 min intro call + resources)
// ---------------------------------------------------------------------------
function prepareStep3() {
  const v = read();
  outcome = fitMatrix(v.stage, v.investment) || 'fit';
  const soft = outcome === 'soft';
  $('[data-s3-title]').textContent = noTimes ? 'Our calendar is full for the next two weeks' : soft ? 'Let’s start with a short intro call' : 'Pick a time that works for you';
  $('[data-s3-sub]').textContent = noTimes
    ? "Your answers are saved. Tell us when you're usually free and a Savvy representative will reach out within 1 business day to set a time."
    : soft
      ? "Based on your answers, a 30-minute call is the best first step. We'll see where you are and what would help most right now."
      : 'Your consultation with a Savvy representative. 45–60 minutes.';
  $('[data-soft-res]').hidden = !soft || noTimes;
  $('[data-call-length]').textContent = soft ? '30 min' : '45–60 min';
  $('[data-booking]').hidden = noTimes;
  $('[data-format-group]').hidden = noTimes;
  $('[data-notimes]').hidden = !noTimes;
  if (!form.elements.format.value) setValue('format', 'video');
  renderCalendar();
  renderReview();
}

const duration = () => (outcome === 'soft' ? 30 : 60);

function renderCalendar() {
  const tz = form.elements.timezone.value || 'America/Chicago';
  $('[data-tz-name]').textContent = tzOptions().find((o) => o.value === tz)?.label || tz;
  const { days, month } = buildSlots({ offsetWeeks: calendarState.offset, timeZone: tz });
  $('[data-cal-month]').textContent = month;
  $('[data-cal-prev]').disabled = calendarState.offset === 0;
  $('[data-cal-next]').disabled = calendarState.offset >= 2;
  const selectedSlot = read().slot;
  const selectedDay = calendarState.day || (selectedSlot && days.find((d) => d.slots.some((s) => s.iso === selectedSlot))?.key) || days.find((d) => d.slots.length)?.key;
  calendarState.day = selectedDay;
  $('[data-cal-grid]').innerHTML = days
    .map(
      (d) => `<label class="cal__day ${d.slots.length ? '' : 'is-full'}"><input type="radio" name="calday" value="${d.key}" ${d.key === selectedDay ? 'checked' : ''} ${d.slots.length ? '' : 'disabled'} aria-label="${escapeHtml(d.long)}${d.slots.length ? `, ${d.slots.length} times` : ', fully booked'}" /><span>${d.date}</span></label>`,
    )
    .join('');
  const day = days.find((d) => d.key === selectedDay);
  $('[data-slots-day]').textContent = day ? day.long : 'Pick a day';
  $('[data-slots]').innerHTML = day
    ? day.slots.map((s) => pill('radio', 'slot', s.iso, slotLabel(s.iso, tz), s.iso === selectedSlot ? 'checked' : '')).join('')
    : '<p class="t-p-sm c-sub">No times on this day.</p>';
  updateBar();
}
$('[data-cal-grid]').addEventListener('change', (e) => {
  calendarState.day = e.target.value;
  renderCalendar();
  if (!reduceMotion) gsap.from('[data-slots] .pill', { y: 8, opacity: 0, stagger: 0.04, duration: 0.3, ease: 'power2.out' });
});
$('[data-cal-prev]').addEventListener('click', () => {
  calendarState = { offset: Math.max(0, calendarState.offset - 1), day: '' };
  renderCalendar();
});
$('[data-cal-next]').addEventListener('click', () => {
  calendarState = { offset: Math.min(2, calendarState.offset + 1), day: '' };
  renderCalendar();
});

function toggleNoTimes(on) {
  noTimes = on;
  if (on) form.querySelectorAll('[name="slot"]').forEach((i) => (i.checked = false));
  prepareStep3();
  $('[data-next-label]').textContent = on ? 'Send my times' : 'Confirm booking';
  persist();
  updateBar();
  const target = on ? $('[data-notimes] h2') : $('[data-s3-title]');
  target.setAttribute('tabindex', '-1');
  target.focus();
  animateIn(on ? $('[data-notimes]') : $('[data-booking]'));
}
$('[data-no-times]').addEventListener('click', () => toggleNoTimes(true));
$('[data-back-to-cal]').addEventListener('click', () => toggleNoTimes(false));

function updateBar() {
  const bar = $('[data-bar-summary]');
  if (step !== 3) return void (bar.textContent = '');
  const v = read();
  if (noTimes) bar.textContent = v.bestTimes.length ? `Call me: ${v.bestTimes.join(', ')}` : '';
  else if (v.slot) bar.textContent = `${slotLabel(v.slot, v.timezone, { day: true, duration: duration() })} · ${v.format === 'phone' ? 'Phone' : 'Video'}`;
  else bar.textContent = '';
}

// Review step summary with edit links
function renderReview() {
  const v = read();
  const lab = (opts, val) => opts.find((o) => o.value === val)?.label || '';
  const row = (k, val) => (val && (!Array.isArray(val) || val.length) ? `<div><dt>${k}</dt><dd>${escapeHtml(Array.isArray(val) ? val.join(', ') : val)}</dd></div>` : '');
  $('[data-review-body]').innerHTML = `
    <section><header><h2 class="t-label-md">About you</h2><button type="button" class="textbtn" data-edit="1">Edit<span class="sr-only"> about you</span></button></header>
      <dl>${row('Name', v.name)}${row('Company', v.company)}${row('Email', v.email)}${row('Phone', v.phone)}${row('Website', v.noWebsite ? 'No website yet' : v.website)}${row('Industry', industryLabel(v.industry))}${row('Role', v.role)}</dl></section>
    <section><header><h2 class="t-label-md">Your business</h2><button type="button" class="textbtn" data-edit="2">Edit<span class="sr-only"> your business</span></button></header>
      <dl>${row('Serves', lab(SERVE, v.serve))}${row('Stage', lab(STAGES, v.stage))}${row('Goals', v.goals)}${row('In the way', v.challenges.map((c) => (c === 'Other' && v.challengeOther ? `Other: ${v.challengeOther}` : c)))}${row('Marketing today', v.marketing)}${row('Monthly investment', lab(INVESTMENTS, v.investment))}${row('Heard about us', v.source)}${row('Text reminders', v.smsConsent ? 'Yes' : '')}</dl></section>`;
}
$('[data-review-body]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-edit]');
  if (!b) return;
  returnToReview = true;
  goStep(Number(b.dataset.edit));
});

// ---------------------------------------------------------------------------
// Submit (loading state, 400 → jump to the field, 502/503/network → retry)
// ---------------------------------------------------------------------------
const alertEl = $('[data-ep-alert]');
const statusEl = $('[data-ep-status]');
function hideAlert() {
  alertEl.hidden = true;
  alertEl.innerHTML = '';
  statusEl.textContent = '';
}
function showAlert(msg, retry) {
  alertEl.hidden = false;
  alertEl.innerHTML = `<span>${escapeHtml(msg)}</span>${retry ? '<button type="button" data-retry>Try again</button>' : ''}`;
  if (retry) $('[data-retry]', alertEl).addEventListener('click', retry);
  alertEl.focus?.();
}

const payload = (extra = {}) => ({ ...read(), tracking, ...extra });

async function submit() {
  const v = read();
  const all = validatePartnership(v, { steps: [1, 2, 3] });
  if (Object.keys(all.errors).length) {
    const s = firstErrorStep(all.errors);
    if (s !== 3) {
      goStep(s);
      validateStep(s);
      return;
    }
    validateStep(3);
    return;
  }
  const btn = $('[data-next]');
  const label = $('[data-next-label]');
  form.classList.add('is-sending');
  btn.setAttribute('aria-disabled', 'true');
  const original = label.textContent;
  label.innerHTML = '<span class="spinner" aria-hidden="true"></span> Booking…';
  statusEl.textContent = 'Sending your answers…';
  hideAlert();
  const res = await postJson('/api/partnership', payload());
  form.classList.remove('is-sending');
  btn.removeAttribute('aria-disabled');
  label.textContent = original;
  statusEl.textContent = '';
  if (res.ok) return showDone(v);
  if (res.status === 400 && res.json.fields) {
    const s = firstErrorStep(res.json.fields) || 3;
    if (s !== step) goStep(s, { focus: false });
    showErrors(res.json.fields, s);
    const first = Object.keys(FIELD_STEP).find((k) => res.json.fields[k]);
    if (first) focusField(first);
    return showAlert('Please check the highlighted fields.');
  }
  showAlert(failureMessage(res), submit);
}

// ---------------------------------------------------------------------------
// 4 · Confirmation (3D rings light up + celebratory burst)
// ---------------------------------------------------------------------------
function showDone(v) {
  step = 'done';
  showView('done');
  setSide('done');
  setStepper(4);
  $('.ep-steps').classList.add('is-complete');
  const first = v.name.trim().split(/\s+/)[0];
  const tz = v.timezone;
  const el = $('[data-view-panel="done"]');
  if (v.noTimes) {
    $('[data-done-title]').textContent = `Thanks, ${first}. We'll call you to set a time.`;
    $('[data-done-time]').textContent = `Best times: ${v.bestTimes.join(', ')}`;
    $('[data-done-meta]').textContent = 'A Savvy representative will reach out within 1 business day.';
    $('.ep-done__cal').hidden = true;
  } else {
    $('[data-done-title]').textContent = `You're booked, ${first}.`;
    $('[data-done-time]').textContent = slotLabel(v.slot, tz, { day: true, duration: duration() });
    $('[data-done-meta]').textContent = `${outcome === 'soft' ? 'Intro call' : 'Growth consultation'} · ${v.format === 'phone' ? 'Phone call' : 'Video call'} · with [Rep name], Savvy Post`;
    const title = outcome === 'soft' ? 'Savvy intro call' : 'Savvy growth consultation';
    $('[data-gcal]').href = gcalUrl({ title, start: v.slot, minutes: duration(), details: 'Growth consultation with a Savvy representative.' });
    const ics = icsFile({ title, start: v.slot, minutes: duration(), description: 'Growth consultation with a Savvy representative.' });
    $('[data-ics]').href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  }
  $('[data-done-sent]').textContent = `Sent to ${v.email.trim()}${v.smsConsent ? ` and by text to ${v.phone.trim()}` : ''}.`;
  const slotDate = v.slot ? new Date(v.slot) : null;
  const fmt = (d, o) => new Intl.DateTimeFormat('en-US', { timeZone: tz || undefined, ...o }).format(d);
  const items = v.noTimes
    ? ['Within 1 business day: a call to set a time', 'On the call: diagnosis and your scorecard', 'Within 1–2 days: scorecard + first growth plan by email']
    : [
        `${fmt(new Date(slotDate.getTime() - 864e5), { weekday: 'short', hour: 'numeric', minute: '2-digit' })}: email reminder`,
        ...(v.smsConsent ? [`${fmt(new Date(slotDate.getTime() - 36e5), { weekday: 'short', hour: 'numeric', minute: '2-digit' })}: text reminder`] : []),
        'On the call: diagnosis and your scorecard',
        'Within 1–2 days: scorecard + first growth plan by email',
      ];
  $('[data-next-tl]').innerHTML = items.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  const ind = industryLabel(v.industry);
  if (v.industry && v.industry !== 'other') {
    $('[data-case-title]').textContent = `How a ${ind === 'HVAC' ? 'HVAC' : ind.toLowerCase()} company in [City] kept 4 new trucks busy`;
    $('[data-case-note]').textContent = `Picked for ${ind === 'HVAC' ? 'HVAC' : ind.toLowerCase()} companies like yours. 6 min.`;
  }
  remove(KEYS.draft);
  el.focus({ preventScroll: true });
  scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  mount3D($('.ep-done__fx'), { scene: 'rings' }).then((api) => {
    if (!api) return;
    const o = { p: 0 };
    gsap.to(o, { p: 1, duration: reduceMotion ? 0 : 2.2, ease: 'power2.inOut', onUpdate: () => api.setProgress(o.p) });
  });
  if (!reduceMotion) {
    gsap.from('.ep-done__check', { scale: 0, rotation: -90, duration: 0.8, ease: 'back.out(2.5)' });
    animateIn(el);
    burst($('.ep-done__check'));
  }
}

function burst(origin) {
  const r = origin.getBoundingClientRect();
  const colors = ['#0792c2', '#293baa', '#ff5527', '#1fa774', '#141a40'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('span');
    p.className = 'confetti';
    p.setAttribute('aria-hidden', 'true');
    p.style.background = colors[i % colors.length];
    p.style.left = `${r.left + r.width / 2}px`;
    p.style.top = `${r.top + r.height / 2}px`;
    document.body.append(p);
    const a = Math.random() * Math.PI * 2;
    const d = 80 + Math.random() * 160;
    gsap.to(p, { x: Math.cos(a) * d, y: Math.sin(a) * d + 60, rotation: Math.random() * 540, opacity: 0, duration: 1.2 + Math.random() * 0.6, ease: 'power3.out', onComplete: () => p.remove() });
  }
}

// ---------------------------------------------------------------------------
// Not a fit yet (automatic): lead recorded in the background, newsletter, manual review request
// ---------------------------------------------------------------------------
function showNotYet() {
  step = 'not-yet';
  showView('not-yet');
  setSide('not-yet');
  $('.ep-steps').classList.add('is-complete');
  setStepper(4);
  const v = read();
  const first = v.name.trim().split(/\s+/)[0];
  $('[data-ny-eyebrow]').textContent = `Thanks for sharing${first ? `, ${first}` : ''}`;
  const ind = industryLabel(v.industry);
  $('[data-ny-sub-label]').textContent = `Get one practical idea for ${v.industry && v.industry !== 'other' ? `${ind === 'HVAC' ? 'HVAC' : ind.toLowerCase()} companies` : 'service companies'} each month`;
  form.closest('main').querySelector('#ny-email').value = v.email;
  const el = $('[data-view-panel="not-yet"]');
  el.focus({ preventScroll: true });
  scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  animateIn(el);
  persist();
  postJson('/api/partnership', payload()); // best effort: the team sees "not a fit yet" leads in the pipeline
}

$('[data-request-review]').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const alert = $('[data-ny-alert]');
  const status = $('[data-ny-status]');
  btn.disabled = true;
  status.textContent = 'Sending…';
  alert.hidden = true;
  const res = await postJson('/api/partnership', payload({ requestReview: true }));
  btn.disabled = false;
  status.textContent = '';
  if (res.ok) {
    btn.hidden = true;
    status.textContent = 'Thanks. A person on our team will review your answers and reply within 2 business days.';
    return;
  }
  alert.hidden = false;
  alert.innerHTML = `<span>${escapeHtml(failureMessage(res))}</span><button type="button">Try again</button>`;
  $('button', alert).addEventListener('click', () => btn.click());
});

$('[data-ny-sub]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const email = f.elements.email;
  const err = $('#ny-err');
  const status = $('[data-ny-sub-status]');
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
  err.textContent = ok ? '' : 'Please enter a valid email address.';
  email.setAttribute('aria-invalid', String(!ok));
  if (!ok) return email.focus();
  status.textContent = 'Subscribing…';
  const res = await postJson('/api/fit-check', { kind: 'newsletter', email: email.value, topic: read().industry, botField: f.elements.botField.value });
  status.textContent = res.ok ? "You're subscribed." : failureMessage(res);
});

// ---------------------------------------------------------------------------
// Intro motion + 3D background; keyboard: Esc on intro does nothing, Exit keeps the draft
// ---------------------------------------------------------------------------
mount3D($('.ep-body__fx'), { scene: 'field', theme: 'light', scrub: false });
if (!reduceMotion) {
  const run = () => {
    const h = $('#ep-intro-title');
    SplitText.create(h, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      aria: 'auto',
      onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1.1, stagger: 0.08, ease: 'expo.out', delay: 0.1 }),
    });
    gsap.from('.ep-intro .eyebrow, .ep-intro__copy .t-p-lg, .expect-list li, .ep-intro__start', { y: 18, opacity: 0, stagger: 0.07, duration: 0.9, ease: 'expo.out', delay: 0.25, clearProps: 'transform,opacity' });
    gsap.from('.ep-side__panel:not([hidden]) > *', { x: 24, opacity: 0, stagger: 0.08, duration: 0.9, ease: 'expo.out', delay: 0.35, clearProps: 'transform,opacity' });
  };
  document.fonts ? document.fonts.ready.then(run) : run();
  // magnetic primary buttons
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('[data-start], [data-next], [data-resume-go]').forEach((btn) => {
      const x = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
      const y = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        x((e.clientX - (r.left + r.width / 2)) * 0.2);
        y((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      btn.addEventListener('pointerleave', () => (x(0), y(0)));
    });
  }
}
setStepper(0);
setSide('intro');
syncDependent();
