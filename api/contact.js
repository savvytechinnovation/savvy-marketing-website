// Vercel Function: POST /api/contact  (contact form on /experience/)
// Delivery channels are configured with environment variables — see api/_lib/deliver.js.
import { validateContact } from '../src/lib/contact-validation.js';
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

  const { values, errors } = validateContact(body);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, error: 'validation', fields: errors });

  const lead = { type: 'contact', ...values, submittedAt: new Date().toISOString(), source: 'savvy-website/experience' };
  const result = await deliver(lead, {
    subject: `New enquiry: ${lead.name}${lead.company ? ` (${lead.company})` : ''}`,
    replyTo: lead.email,
    rows: [['Name', lead.name], ['Email', lead.email], ['Company', lead.company], ['Website', lead.website], ['Services', lead.services], ['Budget', lead.budget], ['Submitted', lead.submittedAt]],
    message: lead.message,
  });
  return respond(res, result);
}
