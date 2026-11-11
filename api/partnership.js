// Vercel Function: POST /api/partnership  (Explore Partnership enquiry + booking request)
// The fit outcome is recomputed here from stage × investment (shared fit matrix), never trusted from the browser.
// Delivery channels are configured with environment variables — see api/_lib/deliver.js.
import { INDUSTRIES, INVESTMENTS, SERVE, STAGES, validatePartnership } from '../src/lib/partnership-validation.js';
import { deliver, readJsonBody, respond } from './_lib/deliver.js';

const label = (opts, v) => opts.find((o) => o.value === v)?.label ?? v;
const tracking = (input) => {
  const out = {};
  for (const k of ['from', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'page']) {
    if (typeof input?.[k] === 'string' && input[k].trim()) out[k] = input[k].trim().slice(0, 200);
  }
  return out;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const { body, error, status } = readJsonBody(req);
  if (error) return res.status(status).json({ ok: false, error });
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ ok: false, error: 'invalid_json' });

  // Honeypot filled -> pretend success so bots don't retry
  if (typeof body.botField === 'string' && body.botField.trim() !== '') return res.status(200).json({ ok: true });

  const { values, errors, outcome } = validatePartnership(body);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, error: 'validation', fields: errors });

  const lead = {
    type: 'partnership',
    outcome, // 'fit' | 'soft' | 'not-yet' (Figma fit matrix)
    ...values,
    tracking: tracking(body.tracking),
    submittedAt: new Date().toISOString(),
    source: 'savvy-website/explore-partnership',
  };
  const outcomeText = { fit: 'Fit · 45–60 min consultation', soft: 'Soft · 30 min intro call', 'not-yet': 'Not a fit yet' }[outcome];
  const when = values.slot
    ? `${values.slot} (${values.format}${values.timezone ? `, shown in ${values.timezone}` : ''})`
    : values.noTimes
      ? `No times suited · call back: ${values.bestTimes.join(', ')}`
      : '—';
  const result = await deliver(lead, {
    subject: `${values.requestReview ? 'Review request' : outcome === 'not-yet' ? 'Not a fit yet' : 'New booking'}: ${values.company} (${label(INDUSTRIES, values.industry)}) — ${outcomeText}`,
    replyTo: values.email,
    rows: [
      ['Outcome', outcomeText + (values.requestReview ? ' · asked for a manual review' : '')],
      ['Call', when],
      ['Name', values.name],
      ['Company', values.company],
      ['Email', values.email],
      ['Phone', values.phone],
      ['Website', values.website || (values.noWebsite ? 'No website yet' : '')],
      ['Industry', label(INDUSTRIES, values.industry)],
      ['Role', values.role],
      ['Serves', label(SERVE, values.serve)],
      ['Stage', label(STAGES, values.stage)],
      ['Monthly investment', label(INVESTMENTS, values.investment)],
      ['Challenges', values.challenges.map((c) => (c === 'Other' && values.challengeOther ? `Other: ${values.challengeOther}` : c))],
      ['Current marketing', values.marketing],
      ['Marketing notes', values.marketingNotes],
      ...Object.entries(values.industryAnswers).map(([k, v]) => [`Industry · ${k}`, v]),
      ['Heard about us', values.source],
      ['SMS consent', values.smsConsent ? 'Yes' : 'No'],
      ['Tracking', Object.entries(lead.tracking).map(([k, v]) => `${k}=${v}`)],
      ['Submitted', lead.submittedAt],
    ],
    message: `Goals (12–24 months):\n${values.goals}`,
  });
  return respond(res, result);
}
