// Client portal sign in. There is NO auth backend yet: api/portal-login.js validates the request and answers
// 503 { error: 'not_configured' }, and this page says so honestly instead of pretending to sign anyone in.
import { initSite, gsap, reduceMotion } from '../../ds/site.js';
import { validatePortal } from './portal-validation.js';
import { $, $$, revealHeadings, magnetic } from '../results/shared.js';
import { mountAurora } from './scene-aurora.js';
import './portal.css';
import './portal-r2.css';

initSite();
revealHeadings();

const ENDPOINT = '/api/portal-login';
const UNAVAILABLE = {
  title: 'Client portal sign-in isn’t available yet',
  desc: 'Contact your account manager for your reports, leads and results in the meantime.',
};

// ---------------------------------------------------------------------------
// Live aurora shader behind the glass panel: keystrokes ripple, focus glows, busy speeds up, errors warm it
// ---------------------------------------------------------------------------
let aurora = null;
mountAurora($('[data-ps-3d]')).then((a) => (aurora = a));
magnetic($$('.ps__submit'), 0.12);

const measure = document.createElement('canvas').getContext('2d');
const coords = $('[data-ps-coords]');
let strokes = 0;
/** Viewport position of the caret (approximate: end of the typed text) */
function caretPoint(input) {
  const r = input.getBoundingClientRect();
  const cs = getComputedStyle(input);
  measure.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const text = input.type === 'password' ? '•'.repeat(input.value.length) : input.value.slice(0, input.selectionStart ?? input.value.length);
  const x = Math.min(r.left + parseFloat(cs.paddingLeft) + measure.measureText(text).width, r.right - 12);
  return [x, r.top + r.height / 2];
}
$$('.ps-input').forEach((input) => {
  input.addEventListener('input', () => {
    strokes++;
    const [x, y] = caretPoint(input);
    aurora?.ripple(x, y, input.value ? 1 : 0.6);
    coords.textContent = `KEYSTROKES ${String(strokes).padStart(3, '0')} · FIELD ${input.name.toUpperCase()}`;
  });
  input.addEventListener('focus', () => {
    const r = input.getBoundingClientRect();
    aurora?.focus(r.left + r.width / 2, r.top + r.height / 2, true);
    input.closest('.ps-field')?.classList.add('is-focus');
  });
  input.addEventListener('blur', () => {
    aurora?.focus(0, 0, false);
    input.closest('.ps-field')?.classList.remove('is-focus');
  });
});
$('.ps').addEventListener('pointerdown', (e) => {
  if (!e.target.closest('input, button, a, label')) aurora?.ripple(e.clientX, e.clientY, 1.3);
});

// Password "strength" meter (UI only: length and character variety; nothing is checked or sent)
{
  const meter = $('[data-meter]');
  const label = $('[data-meter-label]');
  const pw = $('#ps-password');
  const LABELS = ['Length & mix', 'Short', 'Fair', 'Good', 'Strong'];
  const update = () => {
    const v = pw.value;
    let n = 0;
    if (v.length) n = 1;
    if (v.length >= 8) n++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++;
    if (/[\d\W_]/.test(v) && v.length >= 10) n++;
    meter.dataset.level = String(n);
    label.textContent = LABELS[n];
  };
  pw.addEventListener('input', update);
  update();
}

// Showcase cards follow the pointer in depth (fine pointers only)
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
  const show = $('[data-ps-show]');
  const px = gsap.quickTo(show, '--px', { duration: 0.8, ease: 'power3' });
  const py = gsap.quickTo(show, '--py', { duration: 0.8, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    px((e.clientX / innerWidth - 0.5) * 2);
    py((e.clientY / innerHeight - 0.5) * 2);
  }, { passive: true });
}
if (!reduceMotion) gsap.from('.ps-card, .ps-show__label, .ps-show__big', { opacity: 0, y: 40, z: -200, stagger: 0.12, duration: 1.4, ease: 'expo.out', delay: 0.3, clearProps: 'transform' });

// ---------------------------------------------------------------------------
// Panels: sign in ↔ forgot password ↔ confirmation
// ---------------------------------------------------------------------------
const panels = $$('[data-panel]');
function show(name, focusSel) {
  const next = panels.find((p) => p.dataset.panel === name);
  panels.forEach((p) => (p.hidden = p !== next));
  if (!reduceMotion) gsap.fromTo(next.children, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'expo.out', clearProps: 'transform,opacity' });
  (focusSel ? $(focusSel, next) : $('.ps__title', next))?.focus();
}
document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (!go) return;
  if (go.dataset.go === 'forgot') {
    $('#ps-reset-email').value = $('#ps-email').value;
    show('forgot', '#ps-reset-email');
  } else show(go.dataset.go, '#ps-email');
});

// ---------------------------------------------------------------------------
// Field errors (aria-invalid + aria-describedby message)
// ---------------------------------------------------------------------------
function setErrors(form, errors) {
  $$('input[name]', form).forEach((input) => {
    const msg = errors[input.name] || '';
    const err = document.getElementById(`${input.id}-err`);
    if (!err) return;
    err.textContent = msg;
    input.toggleAttribute('aria-invalid', !!msg);
    if (msg) input.setAttribute('aria-invalid', 'true');
    input.closest('.field')?.classList.toggle('has-error', !!msg);
  });
  const first = $$('input[aria-invalid="true"]', form)[0];
  first?.focus();
  return !first;
}
// Clear a field's error as soon as it is corrected
$$('.ps-input').forEach((input) =>
  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') !== 'true') return;
    const form = input.form;
    const data = Object.fromEntries(new FormData(form));
    const { errors } = validatePortal({ ...data, action: form.hasAttribute('data-forgot') ? 'reset' : 'signin' });
    if (!errors[input.name]) {
      input.removeAttribute('aria-invalid');
      input.closest('.field')?.classList.remove('has-error');
      document.getElementById(`${input.id}-err`).textContent = '';
    }
  }),
);

// ---------------------------------------------------------------------------
// Alert banner
// ---------------------------------------------------------------------------
const alertBox = $('[data-alert]');
function alertMsg({ title, desc }, kind = 'error') {
  $('[data-alert-title]').textContent = title;
  $('[data-alert-desc]').textContent = desc;
  alertBox.classList.toggle('ps-alert--info', kind === 'info');
  alertBox.hidden = false;
  aurora?.alert();
  if (!reduceMotion) gsap.fromTo(alertBox, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'expo.out' });
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------
async function post(payload) {
  const started = performance.now();
  let res, data = {};
  try {
    res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    data = await res.json().catch(() => ({}));
  } catch {
    return { network: true };
  } finally {
    // keep the loading state perceptible (no flash)
    const wait = 450 - (performance.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  return { status: res.status, ...data };
}

function busy(btn, on, label) {
  aurora?.busy(on);
  btn.setAttribute('aria-busy', String(on));
  btn.disabled = on;
  const l = $('.ps__submit-label', btn);
  if (!l) return;
  if (on) {
    btn.dataset.label = l.textContent;
    if (label) l.textContent = label;
  } else if (btn.dataset.label) l.textContent = btn.dataset.label;
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------
const signin = $('[data-signin]');
signin.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.hidden = true;
  const data = Object.fromEntries(new FormData(signin));
  const { errors } = validatePortal({ ...data, action: 'signin' });
  if (!setErrors(signin, errors)) return;

  const btn = $('[data-submit]', signin);
  busy(btn, true, 'Signing in…');
  const r = await post({ action: 'signin', email: data.email, password: data.password, remember: !!data.remember, botField: data.botField });
  busy(btn, false);

  if (r.status === 400 && r.fields) return setErrors(signin, r.fields);
  if (r.network) return alertMsg({ title: 'We couldn’t reach the server', desc: 'Check your connection and try again.' });
  // 503 not_configured (and anything else until a real identity provider is connected)
  alertMsg(UNAVAILABLE);
  $('[data-alert]').focus?.();
});

// Google: same honest answer
$('[data-google]').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  alertBox.hidden = true;
  btn.setAttribute('aria-busy', 'true');
  const r = await post({ action: 'google' });
  btn.removeAttribute('aria-busy');
  if (r.network) return alertMsg({ title: 'We couldn’t reach the server', desc: 'Check your connection and try again.' });
  alertMsg(UNAVAILABLE);
});

// Show / hide password + Caps Lock warning
const pass = $('#ps-password');
const toggle = $('[data-toggle-pass]');
toggle.addEventListener('click', () => {
  const show = pass.type === 'password';
  pass.type = show ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(show));
  toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  pass.focus();
});
const caps = $('#ps-caps');
const checkCaps = (e) => {
  if (typeof e.getModifierState !== 'function') return;
  caps.textContent = e.getModifierState('CapsLock') ? 'Caps Lock is on' : '';
};
pass.addEventListener('keydown', checkCaps);
pass.addEventListener('keyup', checkCaps);
pass.addEventListener('blur', () => (caps.textContent = ''));

// ---------------------------------------------------------------------------
// Forgot password → confirmation
// ---------------------------------------------------------------------------
const forgot = $('[data-forgot]');
forgot.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(forgot));
  const { values, errors } = validatePortal({ ...data, action: 'reset' });
  if (!setErrors(forgot, errors)) return;
  const btn = $('[data-submit]', forgot);
  busy(btn, true, 'Sending…');
  const r = await post({ action: 'reset', email: values.email });
  busy(btn, false);
  if (r.status === 400 && r.fields) return setErrors(forgot, r.fields);

  const text = $('[data-sent-text]');
  if (r.ok) {
    $('[data-sent-title]').textContent = 'Check your inbox';
    text.textContent = `If an account exists for ${values.email}, you’ll get a reset link in a few minutes.`;
  } else if (r.network) {
    $('[data-sent-title]').textContent = 'We couldn’t reach the server';
    text.textContent = 'Check your connection and try again, or contact your account manager.';
  } else {
    // 503 not_configured — nothing was sent, say so
    $('[data-sent-title]').textContent = 'Check with your account manager';
    text.textContent = `Online password resets aren’t available yet, so no email was sent. Your account manager can restore access for ${values.email}.`;
  }
  show('sent');
});
