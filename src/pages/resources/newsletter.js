// Newsletter form ([data-newsletter]) used on /resources/ and every article.
// Validation is shared with the API (src/lib/newsletter-validation.js); delivery via POST /api/subscribe.
import { toast } from '../../ds/site.js';
import { validateNewsletter } from '../../lib/newsletter-validation.js';

const MESSAGES = {
  not_configured: 'Subscriptions are temporarily unavailable. Please try again later, or email us and we’ll add you.',
  delivery_failed: 'We couldn’t complete your subscription just now. Please try again in a few minutes.',
  network: 'We couldn’t reach the server. Check your connection and try again.',
  generic: 'Something went wrong. Please try again.',
};

export function initNewsletter(form) {
  const card = form.parentElement;
  const success = card.querySelector('[data-success]');
  const status = form.querySelector('[data-status]');
  const submit = form.querySelector('[type="submit"]');
  const label = submit.querySelector('.nl-form__label');
  const fields = { email: form.elements.email, consent: form.elements.consent };
  let touched = false;

  const showErrors = (errors) => {
    for (const [name, input] of Object.entries(fields)) {
      const msg = errors[name] || '';
      input.setAttribute('aria-invalid', String(Boolean(msg)));
      form.querySelector(`[data-error-for="${name}"]`).textContent = msg;
    }
  };
  const read = () => ({ email: fields.email.value, consent: fields.consent.checked, source: form.elements.source.value, botField: form.elements.botField.value });

  // Re-validate live once the visitor has tried to submit
  form.addEventListener('input', () => touched && showErrors(validateNewsletter(read()).errors));
  form.addEventListener('change', () => touched && showErrors(validateNewsletter(read()).errors));

  const setLoading = (on) => {
    form.classList.toggle('is-loading', on);
    form.setAttribute('aria-busy', String(on));
    submit.disabled = on;
    label.textContent = on ? 'Subscribing…' : 'Subscribe';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    touched = true;
    status.textContent = '';
    const data = read();
    const { errors } = validateNewsletter(data);
    showErrors(errors);
    const first = Object.keys(fields).find((k) => errors[k]);
    if (first) return fields[first].focus();

    setLoading(true);
    let result;
    try {
      const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      result = res.ok && body.ok ? { ok: true } : { ok: false, error: body.error || (res.status === 503 ? 'not_configured' : 'generic'), fields: body.fields };
    } catch {
      result = { ok: false, error: 'network' };
    }
    setLoading(false);

    if (result.ok) {
      form.hidden = true;
      success.hidden = false;
      success.focus();
      toast({ title: 'You’re subscribed', message: 'Thanks! New articles will land in your inbox.', type: 'success' });
      return;
    }
    if (result.error === 'validation' && result.fields) {
      showErrors(result.fields);
      return fields[Object.keys(result.fields)[0]]?.focus();
    }
    const msg = MESSAGES[result.error] || MESSAGES.generic;
    status.textContent = msg;
    toast({ title: 'Subscription not completed', message: msg, type: 'error' });
  });
}

export const initNewsletters = (root = document) => root.querySelectorAll('[data-newsletter]').forEach(initNewsletter);
