// Vercel Function: POST /api/apply  (application form on /careers/<slug>/ and the
// "Send us your CV anyway" form on /careers/)
//
// Body (JSON): { kind: 'role' | 'open', role?: <job slug>, ...fields, botField, cv: { name, size, type, data: <base64> } }
// The CV travels as base64 inside the JSON (files ≤ 5 MB only, ≈ 6.7 MB once encoded), so this
// endpoint parses the body itself with a 7 MB cap instead of readJsonBody() (200 KB cap).
// NOTE: Vercel Functions accept request bodies up to 4.5 MB, so on Vercel the effective CV limit is
// ≈ 3.3 MB (larger files get a 413 from the platform, which the UI reports as a send error).
// To accept full 5 MB files there, switch to a direct-to-storage upload (e.g. Vercel Blob) and send
// only the file URL here.
//
// Everything is re-validated here (fields, role, CV size/type/magic bytes); the client is never trusted.
// Delivery: deliver() from api/_lib/deliver.js. The webhook receives the whole lead including the
// base64 CV (`lead.cv.data`); the email (Resend) only lists the CV name/size in its rows.
import { MAX_BODY_BYTES, formatBytes, validateApplication, validateCvPayload } from '../src/lib/application-validation.js';
import { jobBySlug } from '../src/content/jobs.js';
import { deliver, respond } from './_lib/deliver.js';

/** Read and parse the JSON body with our own size cap. Returns { body } or { error, status }. */
async function readBody(req, limit = MAX_BODY_BYTES) {
  let raw = req.body;
  if (raw && typeof raw === 'object' && !Buffer.isBuffer(raw)) return { body: raw }; // already parsed by the platform
  if (raw === undefined || raw === null) {
    // Stream not consumed yet: read it ourselves, aborting past the limit
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) return { error: 'payload_too_large', status: 413 };
      chunks.push(Buffer.from(chunk));
    }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.isBuffer(raw)) raw = raw.toString('utf8');
  if (typeof raw !== 'string') return { error: 'invalid_json', status: 400 };
  if (Buffer.byteLength(raw) > limit) return { error: 'payload_too_large', status: 413 };
  try {
    const body = raw ? JSON.parse(raw) : {};
    return body && typeof body === 'object' && !Array.isArray(body) ? { body } : { error: 'invalid_json', status: 400 };
  } catch {
    return { error: 'invalid_json', status: 400 };
  }
}

const reference = () => `SP-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  const { body, error, status } = await readBody(req);
  if (error) return res.status(status).json({ ok: false, error });

  // Honeypot filled -> pretend success so bots don't retry
  if (typeof body.botField === 'string' && body.botField.trim() !== '') return res.status(200).json({ ok: true });

  const kind = body.kind === 'open' ? 'open' : 'role';
  const job = kind === 'role' ? jobBySlug(String(body.role || '')) : null;
  if (kind === 'role' && !job) return res.status(400).json({ ok: false, error: 'validation', fields: { role: 'This role is no longer accepting applications.' } });

  const { values, errors } = validateApplication(body, { kind, requiresOverlap: Boolean(job?.requiresOverlap) });
  const { cv, error: cvError } = validateCvPayload(body.cv);
  if (cvError) errors.cv = cvError;
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, error: 'validation', fields: errors });

  const ref = reference();
  const roleTitle = job ? job.title : 'Open application';
  const lead = {
    type: 'job-application',
    kind,
    reference: ref,
    role: job ? job.slug : 'open-application',
    roleTitle,
    ...values,
    cv, // { name, size, type, data (base64) } — webhook only
    submittedAt: new Date().toISOString(),
    source: job ? `savvy-website/careers/${job.slug}` : 'savvy-website/careers',
  };

  const rows =
    kind === 'open'
      ? [['Reference', ref], ['Role', roleTitle], ['Name', values.name], ['Email', values.email], ['Area of interest', values.area], ['LinkedIn / portfolio', values.link]]
      : [
          ['Reference', ref],
          ['Role', roleTitle],
          ['Name', values.name],
          ['Email', values.email],
          ['Phone', values.phone],
          ['Location / time zone', values.location],
          ['Work authorization', values.workAuth],
          ['LinkedIn', values.linkedin],
          ['Portfolio', values.portfolio],
          [job.experienceQuestion || 'Experience', values.experience],
          ['US Eastern overlap (4h+)', values.overlap],
          ['Salary expectation (USD)', values.salary],
          ['Heard about us', values.heardFrom],
          ['Keep on file', values.keepOnFile ? 'Yes' : 'No'],
        ];
  rows.push(['CV', `${cv.name} (${formatBytes(cv.size)}) — attached in the webhook payload`], ['Submitted', lead.submittedAt]);

  const result = await deliver(lead, {
    subject: `Application ${ref}: ${roleTitle} — ${values.name}`,
    replyTo: values.email,
    rows,
    message: kind === 'role' ? `Why Savvy Post?\n\n${values.why}` : undefined,
  });
  if (result.ok) res.setHeader('X-Application-Ref', ref);
  return respond(res, result);
}
