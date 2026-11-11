// Shared lead delivery for every form endpoint (files under api/_lib are not exposed as routes on Vercel).
//
// Configure in Vercel → Project → Settings → Environment Variables (at least one):
//   CONTACT_WEBHOOK_URL   any URL that accepts a JSON POST (Zapier, Make, n8n, Slack workflow, CRM…)
//   RESEND_API_KEY        + CONTACT_TO_EMAIL (+ optional CONTACT_FROM_EMAIL) to receive leads by email via Resend
// With neither set, deliver() reports `not_configured` so the caller answers 503 and leads are never silently dropped.

const MAX_BODY_BYTES = 200_000;

/** Parse a Vercel/Node request body (string or object) safely. Returns { body } or { error, status }. */
export function readJsonBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY_BYTES) return { error: 'payload_too_large', status: 413 };
    try {
      body = body ? JSON.parse(body) : {};
    } catch {
      return { error: 'invalid_json', status: 400 };
    }
  }
  return { body: body ?? {} };
}

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Deliver a lead to every configured channel.
 * @param {object} lead     plain JSON-serialisable record (include a `type`, e.g. 'contact' | 'fit-check' | 'partnership' | 'job-application')
 * @param {{ subject: string, rows: [string, unknown][], replyTo?: string, message?: string }} email
 * @returns {Promise<{ ok: true } | { ok: false, error: 'not_configured' | 'delivery_failed' }>}
 */
export async function deliver(lead, { subject, rows = [], replyTo, message } = {}, env = process.env) {
  const jobs = [];

  if (env.CONTACT_WEBHOOK_URL) {
    jobs.push(
      fetch(env.CONTACT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      }).then((r) => {
        if (!r.ok) throw new Error(`webhook ${r.status}`);
      }),
    );
  }

  if (env.RESEND_API_KEY && env.CONTACT_TO_EMAIL) {
    const table = rows
      .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length))
      .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#667;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 12px">${escapeHtml(Array.isArray(v) ? v.join(', ') : v)}</td></tr>`)
      .join('');
    jobs.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.CONTACT_FROM_EMAIL || 'Savvy Website <onboarding@resend.dev>',
          to: env.CONTACT_TO_EMAIL.split(',').map((s) => s.trim()),
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject,
          html: `<div style="font-family:system-ui,sans-serif;color:#141a40"><h2 style="margin:0 0 12px">${escapeHtml(subject)}</h2><table style="border-collapse:collapse">${table}</table>${message ? `<p style="white-space:pre-wrap;margin-top:16px">${escapeHtml(message)}</p>` : ''}</div>`,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error(`resend ${r.status}`);
      }),
    );
  }

  if (!jobs.length) {
    console.error('[deliver] No delivery configured: set CONTACT_WEBHOOK_URL or RESEND_API_KEY + CONTACT_TO_EMAIL');
    return { ok: false, error: 'not_configured' };
  }
  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length === results.length) {
    console.error('[deliver] All deliveries failed:', failed.map((f) => f.reason?.message));
    return { ok: false, error: 'delivery_failed' };
  }
  if (failed.length) console.warn('[deliver] Partial delivery failure:', failed.map((f) => f.reason?.message));
  return { ok: true };
}

/** Map a deliver() result to an HTTP response. */
export function respond(res, result) {
  if (result.ok) return res.status(200).json({ ok: true });
  return res.status(result.error === 'not_configured' ? 503 : 502).json({ ok: false, error: result.error });
}
