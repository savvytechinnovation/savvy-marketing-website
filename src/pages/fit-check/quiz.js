// 2-minute fit check: one question per step, keyboard support, sessionStorage persistence,
// animated transitions, transparent scoring (src/lib/fit-check.js) and an optional "email me my results".
import { gsap, reduceMotion } from '../../ds/site.js';
import { QUESTIONS, SIGNS, WEIGHTS, STRONG_FIT_MIN_SCORE, scoreFitCheck, validateFitCheckLead, answerLabel } from '../../lib/fit-check.js';
import { KEYS, load, save, escapeHtml, postJson, failureMessage } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const TOTAL = QUESTIONS.length;

/**
 * @param {HTMLElement} root  [data-quiz]
 * @param {{ onProgress?: (p:number)=>void, onResult?: (r:object, answers:object)=>void, onAnswer?: (answers:object)=>void }} hooks
 */
export function initQuiz(root, hooks = {}) {
  if (!root) return null;
  const form = $('[data-quiz-form]', root);
  const viewport = $('[data-quiz-viewport]', root);
  const counter = $('[data-quiz-counter]', root);
  const bar = $('[data-quiz-progress]', root);
  const back = $('[data-quiz-back]', root);
  const nextLabel = $('[data-quiz-next-label]', root);
  const err = $('[data-quiz-error]', root);
  const savedNote = $('[data-quiz-saved]', root);
  const resultEl = $('[data-quiz-result]', root);
  const head = $('[data-quiz-head]', root);

  const stored = load(KEYS.quiz, {});
  const state = {
    answers: stored.answers && typeof stored.answers === 'object' ? stored.answers : {},
    step: Number.isInteger(stored.step) ? Math.min(Math.max(stored.step, 0), TOTAL - 1) : 0,
    done: Boolean(stored.done),
    sent: Boolean(stored.sent),
  };
  let busy = false;
  let queued = false; // Enter pressed mid-transition → continue once it ends

  const persist = () => {
    const ok = save(KEYS.quiz, state);
    if (ok && Object.keys(state.answers).length) savedNote.hidden = false;
  };
  const answeredCount = () => QUESTIONS.filter((q) => state.answers[q.id]).length;

  function renderQuestion(i) {
    const q = QUESTIONS[i];
    const list = q.options.some((o) => o.label.length > 18) || q.options.length > 4 && q.id !== 'industry';
    const opts = q.options
      .map(
        (o, k) => `
        <label class="qopt">
          <input type="radio" name="${q.id}" value="${escapeHtml(o.value)}" ${state.answers[q.id] === o.value ? 'checked' : ''} />
          <span class="qopt__box"><kbd class="qopt__key" aria-hidden="true">${k + 1}</kbd><span class="qopt__text"><span class="t-label-md">${escapeHtml(o.label)}</span>${o.hint ? `<small>${escapeHtml(o.hint)}</small>` : ''}</span></span>
        </label>`,
      )
      .join('');
    return `
      <fieldset class="q ${list ? 'q--list' : ''}" data-q="${q.id}" aria-describedby="${q.hint ? `q-hint-${q.id}` : ''}">
        <legend class="q__title" tabindex="-1">${escapeHtml(q.title)}</legend>
        ${q.hint ? `<p class="q__hint t-p-sm c-sub" id="q-hint-${q.id}">${escapeHtml(q.hint)}</p>` : '<div class="q__hint"></div>'}
        <div class="q__opts">${opts}</div>
      </fieldset>`;
  }

  function updateChrome() {
    counter.textContent = `Question ${state.step + 1} of ${TOTAL}`;
    const p = answeredCount() / TOTAL;
    bar.style.setProperty('--p', String(p));
    bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    bar.setAttribute('aria-valuetext', `${answeredCount()} of ${TOTAL} answered`);
    back.disabled = state.step === 0;
    nextLabel.textContent = state.step === TOTAL - 1 ? 'See my result' : 'Continue';
    hooks.onProgress?.(p);
  }

  /** Swap to step i with a directional slide (dir: 1 forward, -1 back, 0 none). */
  function go(i, dir = 1, { focus = true } = {}) {
    state.step = i;
    persist();
    hooks.onStep?.(i, dir);
    err.textContent = '';
    const html = renderQuestion(i);
    const old = viewport.firstElementChild;
    const swap = () => {
      viewport.innerHTML = html;
      updateChrome();
      const fs = viewport.firstElementChild;
      if (focus) $('.q__title', fs).focus({ preventScroll: true });
      // opacity only (never autoAlpha): visibility:hidden would drop keyboard focus mid-transition
      // depth transition: the next question arrives from behind the card plane, options cascade toward you
      if (!reduceMotion && dir) gsap.from(fs, { rotationY: -14 * dir, z: -160, xPercent: 6 * dir, opacity: 0, duration: 0.7, ease: 'expo.out', clearProps: 'transform' });
      if (!reduceMotion && dir) gsap.from($$('.qopt', fs), { z: -90, rotationX: 18, y: 14, opacity: 0, duration: 0.6, stagger: 0.045, ease: 'expo.out', delay: 0.06, clearProps: 'transform' });
    };
    if (old && !reduceMotion && dir) {
      busy = true;
      gsap.to(old, { rotationY: 12 * dir, z: -120, xPercent: -6 * dir, opacity: 0, duration: 0.22, ease: 'power2.in', onComplete: () => {
          swap();
          busy = false;
          if (queued) {
            queued = false;
            next();
          }
        } });
    } else swap();
  }

  function next() {
    if (busy) return void (queued = true);
    const q = QUESTIONS[state.step];
    if (!state.answers[q.id]) {
      err.textContent = 'Pick an answer to continue.';
      $('.qopt input', viewport)?.focus();
      return;
    }
    if (state.step < TOTAL - 1) go(state.step + 1, 1);
    else finish();
  }

  function prev() {
    if (busy || state.step === 0) return;
    go(state.step - 1, -1);
  }

  function pick(value, { advance = false } = {}) {
    if (busy) return; // ignore input on the outgoing question mid-transition
    const q = QUESTIONS[state.step];
    if (!q.options.some((o) => o.value === value)) return;
    state.answers[q.id] = value;
    state.done = false;
    persist();
    updateChrome();
    err.textContent = '';
    hooks.onAnswer?.(state.answers);
    if (advance) setTimeout(next, reduceMotion ? 0 : 260);
  }

  // Selection (pointer clicks auto-advance; arrow keys inside the radio group only select)
  let pointerPick = false;
  viewport.addEventListener('pointerdown', (e) => (pointerPick = Boolean(e.target.closest('.qopt'))));
  viewport.addEventListener('change', (e) => {
    if (e.target.type !== 'radio') return;
    pick(e.target.value, { advance: pointerPick });
    pointerPick = false;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    next();
  });
  back.addEventListener('click', prev);

  // Keyboard: number keys pick, Enter continues (native submit), Backspace goes back
  root.addEventListener('keydown', (e) => {
    if (resultEl.hidden === false || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'radio') return;
    const n = Number(e.key);
    const inputs = [...viewport.querySelectorAll('input[type=radio]')];
    if (n >= 1 && n <= inputs.length && !busy) {
      e.preventDefault();
      inputs[n - 1].checked = true;
      inputs[n - 1].focus();
      pick(inputs[n - 1].value);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      prev();
    } else if (e.key === 'Enter' && viewport.contains(e.target)) {
      e.preventDefault();
      next();
    }
  });

  // ---------------------------------------------------------------------------
  // Result
  // ---------------------------------------------------------------------------
  function finish({ animate = true } = {}) {
    let r;
    try {
      r = scoreFitCheck(state.answers);
    } catch {
      const missing = QUESTIONS.findIndex((q) => !state.answers[q.id]);
      return go(Math.max(0, missing), 1);
    }
    state.done = true;
    persist();
    form.hidden = true;
    bar.hidden = true;
    head.hidden = true;
    resultEl.hidden = false;
    resultEl.innerHTML = resultHtml(r);
    wireResult(r);
    hooks.onResult?.(r, { ...state.answers }, { animate });
    resultEl.focus({ preventScroll: !animate });
    if (animate && !reduceMotion) {
      gsap.from(resultEl.children, { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out' });
      const fill = $('.meter__fill', resultEl);
      const num = $('[data-score]', resultEl);
      // score: digit scramble, then a fast count that lands exactly on the score
      const o = { v: 0 };
      const scramble = gsap.to({}, { duration: 0.45, onUpdate: () => (num.textContent = String((Math.random() * 100) | 0).padStart(2, '0')) });
      gsap.to(o, { v: r.score, duration: 0.8, ease: 'power3.out', delay: 0.45, onStart: () => scramble.kill(), onUpdate: () => { fill.style.setProperty('--s', o.v / 100); num.textContent = Math.round(o.v); }, onComplete: () => (num.textContent = r.score) });
      gsap.from($('.verdict__title', resultEl), { clipPath: 'inset(0 100% 0 0)', duration: 0.9, ease: 'expo.inOut', delay: 0.15, clearProps: 'clipPath' });
    } else {
      $('.meter__fill', resultEl).style.setProperty('--s', r.score / 100);
    }
    if (animate) root.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function partnershipHref() {
    const p = new URLSearchParams({ from: 'fit-check' });
    if (state.answers.industry && state.answers.industry !== 'other') p.set('industry', state.answers.industry);
    return `/explore-partnership/?${p}`;
  }

  function resultHtml(r) {
    const summary = {
      strong: `You look like the kind of ${escapeHtml(r.industry)} business we built the Growth System for: proven, ready for more work and already investing. The next step is a 45–60 minute consultation.`,
      possible: `There's a lot here we can work with, and a few things worth talking through first. A short 30-minute intro call is the best next step: we'll tell you honestly if a partnership makes sense now.`,
      'not-yet': `We don't think a partnership is the best use of your money yet. That's not a no forever: a few foundations would help you more right now, and they're free.`,
    }[r.outcome];
    const li = (arr) => arr.map((x) => `<li>${escapeHtml(x.text)}</li>`).join('');
    const next =
      r.outcome === 'not-yet'
        ? `<div class="next-res">
            <p class="t-label-md">Start here instead</p>
            <a href="#resources">Guide · The Service Business Growth Playbook →</a>
            <a href="#resources">Article · Too many vendors? Signs your marketing is disconnected →</a>
            <a href="#resources">Tool · Revenue-at-risk calculator →</a>
            <a href="${partnershipHref()}" class="t-p-sm c-sub">Think we got this wrong? Tell us more →</a>
          </div>`
        : `<div class="next">
            <a class="btn btn--l" href="${partnershipHref()}"><span>${r.outcome === 'strong' ? 'Explore Partnership' : 'Book a 30-minute intro call'}</span><span class="btn__icon"><img src="/ds/icons/arrow-up-right.svg" alt="" width="20" height="20" /></span></a>
            <p class="t-p-sm c-sub">Your answers carry over, so you don't answer twice.</p>
          </div>`;
    const rows = QUESTIONS.map((q) => {
      const v = state.answers[q.id];
      const pts = WEIGHTS[q.id]?.[v] ?? 0;
      const max = Math.max(...Object.values(WEIGHTS[q.id] || { a: 0 }));
      return `<tr><td>${escapeHtml(q.title)}<br /><strong>${escapeHtml(answerLabel(q.id, v))}</strong></td><td>${max ? `${pts} / ${max}` : '—'}</td></tr>`;
    }).join('');
    return `
      <div class="verdict verdict--${r.outcome}">
        <span class="verdict__badge">${escapeHtml(r.label)}</span>
        <span class="t-label-sm c-sub">${r.signs.length} of 6 strong-fit signs · ${r.requirements} requirement${r.requirements === 1 ? '' : 's'} to sort out</span>
        <h3 class="t-h4 verdict__title">${escapeHtml(r.label)}${r.outcome === 'not-yet' ? ', and that\'s okay.' : '.'}</h3>
        <p class="t-p-md c-sub">${summary}</p>
      </div>
      <div class="meter" role="img" aria-label="Fit score ${r.score} out of 100. Strong fit starts at ${STRONG_FIT_MIN_SCORE}.">
        <p class="meter__score"><span data-score>${r.score}</span><small>/100</small></p>
        <div class="meter__track"><span class="meter__fill"></span><span class="meter__mark" title="Strong fit threshold"></span></div>
        <p class="meter__legend t-label-xs c-muted"><span>Fit score</span><span>Strong fit from ${STRONG_FIT_MIN_SCORE}</span></p>
      </div>
      <div class="why">
        ${r.strengths.length ? `<div class="why__col"><p class="t-label-md">Working in your favour</p><ul role="list">${li(r.strengths)}</ul></div>` : ''}
        ${r.gaps.length ? `<div class="why__col why__col--gaps"><p class="t-label-md">Worth sorting out</p><ul role="list">${li(r.gaps)}</ul></div>` : ''}
      </div>
      ${next}
      <details class="model">
        <summary>How we score this</summary>
        <div class="model__body">
          <p>Every answer adds points (max 100). The result also checks the same stage × investment matrix our team uses for the assessment. Any of these means "not the right fit yet": still defining your offer, no capacity for more work, or looking mainly for the cheapest option. "Strong fit" needs ${STRONG_FIT_MIN_SCORE}+ points, a long-term focus and one of our five industries.</p>
          <table><tbody>${rows}<tr><td><strong>Total</strong></td><td><strong>${r.score} / 100</strong></td></tr></tbody></table>
          <p>Strong-fit signs: ${SIGNS.map((s) => `${r.signs.includes(s.id) ? '✓' : '○'} ${escapeHtml(s.label)}`).join(' · ')}</p>
        </div>
      </details>
      ${
        state.sent
          ? '<p class="form-ok" role="status">Your results are on their way to your inbox.</p>'
          : `<form class="sendres" data-sendres novalidate>
        <p class="t-label-md">Email me my results <span class="t-p-sm c-sub">(optional)</span></p>
        <div class="sendres__row">
          <div class="field"><label class="field__label" for="sr-name">Name</label><input class="input" id="sr-name" name="name" autocomplete="name" aria-describedby="sr-name-err" /><p class="field__error" id="sr-name-err"></p></div>
          <div class="field"><label class="field__label" for="sr-email">Email</label><input class="input" id="sr-email" name="email" type="email" autocomplete="email" placeholder="name@company.com" aria-describedby="sr-email-err" /><p class="field__error" id="sr-email-err"></p></div>
        </div>
        <input class="hp" type="text" name="botField" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <label class="check"><input type="checkbox" name="consent" aria-describedby="sr-consent-err" /><span>Email me my results and occasional practical ideas. Unsubscribe anytime.</span></label>
        <p class="field__error" id="sr-consent-err"></p>
        <p class="form-alert" data-sendres-alert role="alert" hidden></p>
        <div class="sendres__foot">
          <button class="btn" type="submit"><span data-sendres-label>Send my results</span><span class="btn__icon"><img src="/ds/icons/arrow-up-right.svg" alt="" width="20" height="20" /></span></button>
        </div>
      </form>`
      }
      <div class="share" data-share>
        <div class="share__card" data-share-card aria-hidden="true"><img alt="" data-share-img width="600" height="315" /><span class="share__glare"></span></div>
        <div class="share__body">
          <p class="t-label-md">Your result card</p>
          <p class="t-p-sm c-sub">Share it with a partner or your office manager. It shows your score and fit signs, never your answers.</p>
          <div class="share__btns">
            <button class="chip" type="button" data-share-native>Share result</button>
            <button class="chip" type="button" data-share-download>Download card (.png)</button>
          </div>
          <p class="t-label-xs c-sub" data-share-status role="status"></p>
        </div>
      </div>
      <div class="result-actions">
        <button class="textbtn" type="button" data-edit>Edit my answers</button>
        <button class="textbtn" type="button" data-restart>Start over</button>
      </div>`;
  }

  function wireResult(r) {
    $('[data-edit]', resultEl).addEventListener('click', () => reopen(0));
    $('[data-restart]', resultEl).addEventListener('click', () => {
      state.answers = {};
      state.done = false;
      state.sent = false;
      reopen(0);
      hooks.onAnswer?.(state.answers);
    });
    const f = $('[data-sendres]', resultEl);
    if (!f) return;
    const fields = { name: 'sr-name-err', email: 'sr-email-err', consent: 'sr-consent-err' };
    const alertEl = $('[data-sendres-alert]', f);
    const read = () => ({ name: f.elements.name.value, email: f.elements.email.value, consent: f.elements.consent.checked, botField: f.elements.botField.value, answers: state.answers, source: new URLSearchParams(location.search).get('from') || '' });
    const show = (errors) => {
      for (const [k, id] of Object.entries(fields)) {
        document.getElementById(id).textContent = errors[k] || '';
        f.elements[k].toggleAttribute('aria-invalid', Boolean(errors[k]));
        f.elements[k].setAttribute('aria-invalid', errors[k] ? 'true' : 'false');
      }
    };
    f.addEventListener('focusout', (e) => {
      if (!(e.target.name in fields)) return;
      if (!e.target.value && e.target.type !== 'checkbox' && !f.dataset.touched) return;
      const { errors } = validateFitCheckLead(read());
      const only = { [e.target.name]: errors[e.target.name] };
      document.getElementById(fields[e.target.name]).textContent = only[e.target.name] || '';
      e.target.setAttribute('aria-invalid', only[e.target.name] ? 'true' : 'false');
    });
    const submit = async () => {
      f.dataset.touched = '1';
      const data = read();
      const { errors } = validateFitCheckLead(data);
      show(errors);
      if (Object.keys(errors).length) {
        f.elements[Object.keys(fields).find((k) => errors[k])]?.focus();
        return;
      }
      f.classList.add('is-sending');
      $('[data-sendres-label]', f).textContent = 'Sending…';
      alertEl.hidden = true;
      const res = await postJson('/api/fit-check', data);
      f.classList.remove('is-sending');
      $('[data-sendres-label]', f).textContent = 'Send my results';
      if (res.ok) {
        state.sent = true;
        persist();
        const ok = document.createElement('p');
        ok.className = 'form-ok';
        ok.setAttribute('role', 'status');
        ok.tabIndex = -1;
        ok.textContent = `Thanks, ${data.name.trim().split(/\s+/)[0]}. Your results are on their way to ${data.email.trim()}.`;
        f.replaceWith(ok);
        ok.focus();
        if (!reduceMotion) gsap.from(ok, { scale: 0.96, opacity: 0, duration: 0.5, ease: 'back.out(2)' });
        return;
      }
      if (res.status === 400 && res.json.fields) return show(res.json.fields);
      alertEl.hidden = false;
      alertEl.innerHTML = `<span>${escapeHtml(failureMessage(res))}</span><button type="button" data-retry>Try again</button>`;
      $('[data-retry]', alertEl).addEventListener('click', submit);
    };
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!f.classList.contains('is-sending')) submit();
    });
  }

  function reopen(step) {
    resultEl.hidden = true;
    resultEl.innerHTML = '';
    form.hidden = false;
    bar.hidden = false;
    head.hidden = false;
    state.done = false;
    go(step, -1);
  }

  // Boot: restore saved progress
  if (state.done && QUESTIONS.every((q) => state.answers[q.id])) finish({ animate: false });
  else go(state.step, 0, { focus: false });
  if (Object.keys(state.answers).length) savedNote.hidden = false;

  return { state };
}

const $$ = (s, r = document) => [...r.querySelectorAll(s)];
