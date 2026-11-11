// Vercel Function: POST /api/fit-check  ("Email me my results" on /are-we-a-fit/)
// The score is recomputed here from the raw answers with the shared model, never trusted from the browser.
// Delivery channels are configured with environment variables — see api/_lib/deliver.js.
import { EMAIL_RE, answerLabel, scoreFitCheck, validateFitCheckLead } from '../src/lib/fit-check.js';
import { deliver, readJsonBody, respond } from './_lib/deliver.js';

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

  // "Not a fit yet? Start here instead" newsletter sign-up (same page / partnership exit) — email only
  if (body.kind === 'newsletter') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 150) : '';
    if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'validation', fields: { email: 'Please enter a valid email address.' } });
    const gaps = (Array.isArray(body.gaps) ? body.gaps : []).filter((g) => ['offer', 'capacity', 'budget', 'measurement'].includes(g));
    const topic = typeof body.topic === 'string' ? body.topic.slice(0, 60) : '';
    const lead = { type: 'fit-check', kind: 'newsletter', email, gaps, topic, submittedAt: new Date().toISOString(), source: 'savvy-website/are-we-a-fit' };
    return respond(res, await deliver(lead, { subject: `Newsletter sign-up: ${email}`, replyTo: email, rows: [['Email', email], ['Missing right now', gaps], ['Topic', topic], ['Submitted', lead.submittedAt]] }));
  }

  const { values, errors } = validateFitCheckLead(body);
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, error: 'validation', fields: errors });

  const result = scoreFitCheck(values.answers);
  const source = typeof body.source === 'string' ? body.source.slice(0, 200) : '';
  const lead = {
    type: 'fit-check',
    name: values.name,
    email: values.email,
    consent: true,
    answers: values.answers,
    result: { outcome: result.outcome, label: result.label, score: result.score, matrix: result.matrix, signs: result.signs, blockers: result.blockers },
    submittedAt: new Date().toISOString(),
    source: `savvy-website/are-we-a-fit${source ? ` · ${source}` : ''}`,
  };
  const a = values.answers;
  const result_ = await deliver(lead, {
    subject: `Fit check: ${result.label} (${result.score}/100) — ${lead.name}`,
    replyTo: lead.email,
    rows: [
      ['Name', lead.name],
      ['Email', lead.email],
      ['Result', `${result.label} · ${result.score}/100 · matrix ${result.matrix}`],
      ['Strong-fit signs', `${result.signs.length} of 6`],
      ['Industry', answerLabel('industry', a.industry)],
      ['Stage', answerLabel('stage', a.stage)],
      ['Monthly investment', answerLabel('investment', a.investment)],
      ['Proven service', answerLabel('proven', a.proven)],
      ['Capacity (90 days)', answerLabel('capacity', a.capacity)],
      ['CRM / ad access', answerLabel('data', a.data)],
      ['Decision-maker', answerLabel('decision', a.decision)],
      ['Markets', answerLabel('markets', a.markets)],
      ['Looking for', answerLabel('intent', a.intent)],
      ['Submitted', lead.submittedAt],
    ],
  });
  return respond(res, result_);
}
