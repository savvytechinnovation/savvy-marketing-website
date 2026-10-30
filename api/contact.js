// Vercel Function: POST /api/contact
//
// Delivery is configured with environment variables (Vercel → Project → Settings → Environment Variables):
//   CONTACT_WEBHOOK_URL   any URL that accepts a JSON POST (Zapier, Make, n8n, Slack workflow, CRM…)
//   RESEND_API_KEY        + CONTACT_TO_EMAIL (+ optional CONTACT_FROM_EMAIL) to receive leads by email via Resend
// At least one must be set; otherwise the endpoint answers 503 so leads are never silently dropped.
import { validateContact } from '../src/lib/contact-validation.js';

const MAX_BODY_BYTES = 20_000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY_BYTES) return res.status(413).json({ ok: false, error: 'payload_too_large' });
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'invalid_json' });
    }
  }
  body ??= {};

  // Honeypot filled -> pretend success so bots don't retry
  if (typeof body.botField === 'string' && body.botField.trim() !== '') {
    return res.status(200).json({ ok: true });
  }

  const { values, errors } = validateContact(body);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, error: 'validation', fields: errors });

  const lead = { ...values, submittedAt: new Date().toISOString(), source: 'savvy-website/home' };
  const env = process.env;
  const deliveries = [];

  if (env.CONTACT_WEBHOOK_URL) {
    deliveries.push(
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
    deliveries.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.CONTACT_FROM_EMAIL || 'Savvy Website <onboarding@resend.dev>',
          to: env.CONTACT_TO_EMAIL.split(',').map((s) => s.trim()),
          reply_to: lead.email,
          subject: `New enquiry: ${lead.name}${lead.company ? ` (${lead.company})` : ''}`,
          html: renderEmail(lead),
        }),
      }).then((r) => {
        if (!r.ok) throw new Error(`resend ${r.status}`);
      }),
    );
  }

  if (!deliveries.length) {
    console.error('[contact] No delivery configured: set CONTACT_WEBHOOK_URL or RESEND_API_KEY + CONTACT_TO_EMAIL');
    return res.status(503).json({ ok: false, error: 'not_configured' });
  }

  const results = await Promise.allSettled(deliveries);
  const failed = results.filter((r) => r.status === 'rejected');
  // Success if at least one channel received the lead
  if (failed.length === results.length) {
    console.error('[contact] All deliveries failed:', failed.map((f) => f.reason?.message));
    return res.status(502).json({ ok: false, error: 'delivery_failed' });
  }
  if (failed.length) console.warn('[contact] Partial delivery failure:', failed.map((f) => f.reason?.message));

  return res.status(200).json({ ok: true });
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function renderEmail(lead) {
  const row = (label, value) =>
    value ? `<tr><td style="padding:6px 12px;color:#667;vertical-align:top">${label}</td><td style="padding:6px 12px">${escapeHtml(value)}</td></tr>` : '';
  return `<div style="font-family:system-ui,sans-serif;color:#14173d">
    <h2 style="margin:0 0 12px">New website enquiry</h2>
    <table style="border-collapse:collapse">
      ${row('Name', lead.name)}${row('Email', lead.email)}${row('Company', lead.company)}${row('Website', lead.website)}
      ${row('Services', lead.services.join(', '))}${row('Budget', lead.budget)}${row('Submitted', lead.submittedAt)}
    </table>
    <p style="white-space:pre-wrap;margin-top:16px">${escapeHtml(lead.message)}</p>
  </div>`;
}
