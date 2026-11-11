// Small form helpers shared by the open-application form (/careers/) and the role form (/careers/<slug>/).

/** Show / clear a field-level error (message linked via aria-describedby, aria-invalid on the control). */
export function setFieldError(form, name, msg = '') {
  const field = form.querySelector(`[data-field="${name}"]`);
  if (!field) return;
  field.classList.toggle('has-error', Boolean(msg));
  const err = field.querySelector('.field__error');
  if (err) err.textContent = msg;
  field.querySelectorAll('input, select, textarea').forEach((c) => {
    if (c.type === 'checkbox' && c.name !== name) return;
    if (msg) c.setAttribute('aria-invalid', 'true');
    else c.removeAttribute('aria-invalid');
  });
}

/** Plain object of the form's values (checkboxes → boolean, files skipped). */
export function formValues(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name || el.type === 'file' || el.type === 'submit' || el.type === 'button') continue;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'radio') {
      if (el.checked) out[el.name] = el.value;
      else if (!(el.name in out)) out[el.name] = '';
    } else out[el.name] = el.value;
  }
  return out;
}

/** Lock / unlock every control while sending (fields stay visible, never hidden). */
export function lockForm(form, on) {
  for (const el of form.elements) el.disabled = on;
  form.setAttribute('aria-busy', String(on));
}

/**
 * POST JSON and normalise the outcome.
 * @returns {Promise<{ ok: boolean, status: number, error?: string, fields?: Record<string,string>, ref?: string }>}
 */
export async function postJson(url, data, { timeoutMs = 60000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: ctrl.signal });
    let json = {};
    try {
      json = await res.json();
    } catch {
      /* non-JSON (e.g. platform 413 page) */
    }
    return { ok: res.ok && json.ok !== false, status: res.status, error: json.error, fields: json.fields, ref: res.headers.get('X-Application-Ref') || '' };
  } catch (e) {
    return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(t);
  }
}

/** Human message for a failed send. */
export function sendErrorText(r) {
  if (r.status === 503) return 'Applications are temporarily unavailable on the website. Your answers are saved on this device; please try again later.';
  if (r.status === 413) return 'Your CV is too large to send from this page. Upload a smaller file (under 3 MB) and try again.';
  if (r.status === 0) return 'Check your connection and try again. Your answers are saved on this device.';
  return 'Something went wrong on our side. Your answers are saved on this device; please try again.';
}
