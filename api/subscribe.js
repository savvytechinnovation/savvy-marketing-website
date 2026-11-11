// Vercel Function: POST /api/subscribe  (newsletter forms on /resources/ and every article)
// Delivery channels are configured with environment variables — see api/_lib/deliver.js.
import { validateNewsletter } from '../src/lib/newsletter-validation.js';
import { deliver, readJsonBody, respond } from './_lib/deliver.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const { body, error, status } = readJsonBody(req);
  if (error) return res.status(status).json({ ok: false, error });

  // Honeypot filled -> pretend success so bots don't retry
  if (typeof body.botField === 'string' && body.botField.trim() !== '') return res.status(200).json({ ok: true });

  const { values, errors } = validateNewsletter(body);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, error: 'validation', fields: errors });

  const lead = { type: 'newsletter', ...values, submittedAt: new Date().toISOString(), source: `savvy-website${values.source}` };
  const result = await deliver(lead, {
    subject: `New newsletter subscriber: ${lead.email}`,
    replyTo: lead.email,
    rows: [['Email', lead.email], ['Consent', lead.consent ? 'Yes' : 'No'], ['Subscribed from', values.source], ['Submitted', lead.submittedAt]],
  });
  return respond(res, result);
}
