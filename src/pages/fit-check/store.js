// sessionStorage helpers (wrapped: storage can be disabled, full or throw in private modes).
export const KEYS = {
  quiz: 'savvy:fit-check', // { answers, step, done, sent }
  profile: 'savvy:fit-profile', // carried into /explore-partnership/: { industry, stage, investment, markets, outcome, signs, requirements }
  page: 'savvy:fit-page', // section self-checks on /are-we-a-fit/
  draft: 'savvy:ep-draft', // Explore Partnership autosave
};

export function load(key, fallback = null) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** POST JSON with a timeout. Resolves { ok, status, json } or { ok:false, status:0, network:true }. */
export async function postJson(url, data, { timeout = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && json.ok === true, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: {}, network: true };
  } finally {
    clearTimeout(timer);
  }
}

/** Human message for a failed submission. */
export function failureMessage(r) {
  if (r.network) return 'Connection problem: nothing was sent. Check your connection and try again.';
  if (r.status === 503) return "Our form isn't accepting submissions right now. Please try again shortly, or email us.";
  if (r.status === 502) return "We couldn't deliver your answers just now. Please try again in a minute.";
  if (r.status === 413) return 'That was too much text to send. Please shorten your answers.';
  return 'Something went wrong on our side. Please try again.';
}
