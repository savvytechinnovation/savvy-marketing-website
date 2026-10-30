import { validateContact } from '../lib/contact-validation.js';

const FIELD_IDS = { name: 'e-name', email: 'e-email', website: 'e-website', message: 'e-message', consent: 'e-consent' };
const TIMEOUT_MS = 12000;

/**
 * Contact form: client-side validation (same rules as the API), accessible errors,
 * POST /api/contact with timeout, loading/success/error states.
 * @param {HTMLFormElement} form
 * @param {{ onSuccess?: () => void }} hooks
 */
export function initContactForm(form, { onSuccess } = {}) {
  if (!form) return;
  const submit = form.querySelector('.form__submit');
  const status = form.querySelector('.form__status');

  const read = () => {
    const fd = new FormData(form);
    return {
      name: fd.get('name'),
      email: fd.get('email'),
      company: fd.get('company'),
      website: fd.get('website'),
      services: fd.getAll('services'),
      budget: fd.get('budget') || '',
      message: fd.get('message'),
      consent: form.elements.consent.checked,
      botField: fd.get('botField') || '',
    };
  };

  const showErrors = (errors) => {
    for (const [field, id] of Object.entries(FIELD_IDS)) {
      const msg = errors[field] || '';
      document.getElementById(id).textContent = msg;
      const input = form.elements[field];
      if (input) input.toggleAttribute('aria-invalid', Boolean(msg));
      input?.closest('.field, .consent')?.classList.toggle('has-error', Boolean(msg));
    }
  };

  // Re-validate a field once the user has interacted with it
  form.addEventListener('focusout', (e) => {
    const name = e.target.name;
    if (!(name in FIELD_IDS) || !form.dataset.touched) return;
    showErrors(validateContact(read()).errors);
  });
  form.addEventListener('input', () => {
    if (form.dataset.touched) showErrors(validateContact(read()).errors);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.classList.contains('is-sending')) return;
    form.dataset.touched = '1';
    const data = read();
    const { errors } = validateContact(data);
    showErrors(errors);
    if (Object.keys(errors).length) {
      const first = Object.keys(FIELD_IDS).find((f) => errors[f]);
      form.elements[first]?.focus();
      setStatus('Please check the highlighted fields.', 'error');
      return;
    }

    form.classList.add('is-sending');
    submit.disabled = true;
    setStatus('Sending…', '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        success(data.name);
        return;
      }
      if (res.status === 400 && json.fields) {
        showErrors(json.fields);
        setStatus('Please check the highlighted fields.', 'error');
      } else {
        setStatus("We couldn't send your message right now. Please try again in a few minutes.", 'error');
      }
    } catch {
      setStatus('Connection problem — your message was not sent. Please try again.', 'error');
    } finally {
      clearTimeout(timer);
      form.classList.remove('is-sending');
      submit.disabled = false;
    }
  });

  function setStatus(text, type) {
    status.textContent = text;
    status.dataset.type = type;
  }

  function success(name) {
    const first = String(name).trim().split(/\s+/)[0];
    const panel = document.createElement('div');
    panel.className = 'form-success';
    panel.setAttribute('role', 'status');
    panel.tabIndex = -1;
    panel.innerHTML = `
      <span class="form-success__check" aria-hidden="true"></span>
      <h3>Thanks, ${escapeHtml(first)} — message received.</h3>
      <p>We'll get back to you within one business day.</p>`;
    form.replaceWith(panel);
    panel.focus();
    onSuccess?.(panel);
  }
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
