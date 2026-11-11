// Job application rules, shared by the browser (src/pages/job/job.js, src/pages/careers/careers.js)
// and the Vercel function (api/apply.js) so both sides apply exactly the same checks.
// The server never trusts the client: it re-runs validateApplication() and validateCvPayload()
// on every request (the latter also checks the decoded size and the file's magic bytes).
//
// CV transport: the file travels inside the JSON body as base64 (`cv.data`), only when it is
// ≤ MAX_CV_BYTES (5 MB). Base64 adds ~33 %, so a full request can reach ~7 MB; api/apply.js reads
// the body itself with a 7 MB cap (api/_lib/deliver.js caps other forms at 200 KB).

export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const MAX_BODY_BYTES = 7 * 1024 * 1024;

export const CV_TYPES = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
export const CV_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const TIMEZONES = [
  '(UTC−10:00) Hawaii',
  '(UTC−09:00) Alaska',
  '(UTC−08:00) Pacific Time — US & Canada',
  '(UTC−07:00) Mountain Time — US & Canada',
  '(UTC−06:00) Central Time — US & Canada',
  '(UTC−06:00) Mexico City',
  '(UTC−05:00) Eastern Time — US & Canada',
  '(UTC−05:00) Bogotá, Lima',
  '(UTC−04:00) Atlantic Time, Caracas',
  '(UTC−03:00) Buenos Aires, São Paulo',
  '(UTC+00:00) London, Lisbon',
  '(UTC+01:00) Central Europe',
  '(UTC+02:00) Eastern Europe, Cairo',
  '(UTC+05:30) India',
  '(UTC+08:00) Manila, Singapore',
  'Other',
];
export const WORK_AUTH = ['Authorized to work in the US', 'Will need visa sponsorship', 'Outside the US (contractor)'];
export const EXPERIENCE = ['Less than 2', '2–4', '5+'];
export const HEARD_FROM = ['LinkedIn', 'Job board', 'A friend or someone at Savvy', 'Savvy’s website or content', 'Other'];
export const OPEN_AREAS = ['Strategy', 'Media', 'Creative', 'Data', 'Operations', 'Something else'];

export const LIMITS = { name: 80, email: 150, phone: 20, url: 300, why: 600, whyMin: 20, salary: 12 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+()\-.\s]{7,20}$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bool = (v) => v === true || v === 'on' || v === 'true';
const pick = (v, list) => (list.includes(v) ? v : '');

export const MESSAGES = {
  name: 'Enter your full name.',
  email: 'Enter a valid email, like name@email.com.',
  phone: 'Enter a phone number with country code, like +1 555 000 0000.',
  location: 'Choose your time zone.',
  workAuth: 'Choose your work authorization.',
  linkedin: 'Paste your LinkedIn profile link, like linkedin.com/in/your-name.',
  portfolio: 'Enter a valid link, like https://yoursite.com.',
  link: 'Enter a valid link, like https://linkedin.com/in/your-name.',
  whyShort: 'Tell us a bit more (at least 20 characters).',
  whyLong: 'Keep it under 600 characters.',
  experience: 'Choose one option.',
  overlap: 'Choose Yes or No.',
  salary: 'Use numbers only, like 80,000.',
  area: 'Choose an area.',
  consent: 'Please agree so we can review your application.',
  consentOpen: 'Please agree so we can keep your CV on file.',
  cvMissing: 'Upload your CV as a PDF, DOC or DOCX.',
  cvType: 'Upload your CV as a PDF, DOC or DOCX.',
  cvEmpty: 'This file is empty. Upload your CV as a PDF, DOC or DOCX.',
  cvCorrupt: 'We couldn’t read this file. Upload your CV as a PDF, DOC or DOCX.',
  role: 'This role is no longer accepting applications.',
};

/** "1.2 MB" / "640 KB" */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const extOf = (name) => (String(name).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || '';

/** Normalise a link: adds https:// when missing. Returns '' when it isn't a valid http(s) URL. */
export function normalizeUrl(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (!url.hostname.includes('.')) return '';
    return url.href;
  } catch {
    return '';
  }
}

/**
 * Client + server check of the CV metadata.
 * @param {{name?: string, size?: number, type?: string} | null | undefined} file
 * @returns {string} error message, or '' when valid
 */
export function validateCvMeta(file) {
  if (!file || !file.name) return MESSAGES.cvMissing;
  const ext = extOf(file.name);
  if (!CV_TYPES[ext]) return MESSAGES.cvType;
  // Some browsers/OSes report an empty or generic type for .doc/.docx; the extension (and the
  // server-side magic-byte check) decide then. A *different* explicit type is rejected.
  if (file.type && file.type !== 'application/octet-stream' && !CV_TYPES[ext].includes(file.type)) return MESSAGES.cvType;
  const size = Number(file.size);
  if (!Number.isFinite(size) || size <= 0) return MESSAGES.cvEmpty;
  if (size > MAX_CV_BYTES) return `This file is ${formatBytes(size)}. Upload one under 5 MB.`;
  return '';
}

// --- tiny base64 helpers (no Buffer/atob so this module runs unchanged in the browser and Node) ---
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
export function base64DecodedSize(b64) {
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return (b64.length / 4) * 3 - pad;
}
function base64Head(b64, n = 8) {
  const out = [];
  for (let i = 0; i + 3 < b64.length && out.length < n; i += 4) {
    const [a, b, c, d] = [...b64.slice(i, i + 4)].map((ch) => (ch === '=' ? 0 : B64.indexOf(ch)));
    out.push((a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d);
  }
  return out.slice(0, n);
}
const MAGIC = {
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  doc: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]], // OLE2 compound file
  docx: [[0x50, 0x4b, 0x03, 0x04]], // ZIP (OOXML)
};

/**
 * Server-side check of the uploaded CV: metadata + base64 content (decoded size and magic bytes).
 * The declared size is ignored in favour of the real decoded size.
 * @returns {{ cv: {name: string, size: number, type: string, data: string} | null, error: string }}
 */
export function validateCvPayload(cv) {
  if (!cv || typeof cv !== 'object' || typeof cv.data !== 'string' || !cv.data) return { cv: null, error: MESSAGES.cvMissing };
  const data = cv.data.replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  if (data.length % 4 !== 0 || !B64_RE.test(data)) return { cv: null, error: MESSAGES.cvCorrupt };
  const name = str(cv.name, 200).replace(/[\\/\r\n"]/g, '_');
  const size = base64DecodedSize(data);
  const type = str(cv.type, 120);
  const metaError = validateCvMeta({ name, size, type });
  if (metaError) return { cv: null, error: metaError };
  const ext = extOf(name);
  const head = base64Head(data, 8);
  const ok = MAGIC[ext].some((sig) => sig.every((byte, i) => head[i] === byte));
  if (!ok) return { cv: null, error: MESSAGES.cvCorrupt };
  return { cv: { name, size, type: type && type !== 'application/octet-stream' ? type : CV_TYPES[ext][0], data }, error: '' };
}

/**
 * Validate a role application (kind "role") or an open application from /careers/ (kind "open").
 * The CV is NOT checked here (the browser checks the File, the server calls validateCvPayload()).
 * @param {Record<string, unknown>} input raw form data
 * @param {{ kind?: 'role' | 'open', requiresOverlap?: boolean }} [opts]
 * @returns {{ values: object, errors: Record<string, string> }}
 */
export function validateApplication(input = {}, { kind = 'role', requiresOverlap = false } = {}) {
  const errors = {};
  const values = {
    name: str(input.name, LIMITS.name),
    email: str(input.email, LIMITS.email).toLowerCase(),
    consent: bool(input.consent),
  };
  if (values.name.length < 2) errors.name = MESSAGES.name;
  if (!EMAIL_RE.test(values.email)) errors.email = MESSAGES.email;

  if (kind === 'open') {
    values.area = pick(input.area, OPEN_AREAS);
    values.link = normalizeUrl(str(input.link, LIMITS.url));
    if (!values.area) errors.area = MESSAGES.area;
    if (!values.link) errors.link = MESSAGES.link;
    if (!values.consent) errors.consent = MESSAGES.consentOpen;
    return { values, errors };
  }

  values.phone = str(input.phone, 40);
  values.location = pick(input.location, TIMEZONES);
  values.workAuth = pick(input.workAuth, WORK_AUTH);
  values.linkedin = normalizeUrl(str(input.linkedin, LIMITS.url));
  values.portfolio = str(input.portfolio, LIMITS.url);
  values.why = typeof input.why === 'string' ? input.why.trim() : '';
  values.experience = pick(input.experience, EXPERIENCE);
  values.overlap = requiresOverlap ? pick(input.overlap, ['Yes', 'No']) : '';
  values.salary = str(input.salary, 40);
  values.heardFrom = pick(input.heardFrom, HEARD_FROM);
  values.keepOnFile = bool(input.keepOnFile);

  if (values.phone && !PHONE_RE.test(values.phone)) errors.phone = MESSAGES.phone;
  if (!values.location) errors.location = MESSAGES.location;
  if (!values.workAuth) errors.workAuth = MESSAGES.workAuth;
  if (!values.linkedin || !/(^|\.)linkedin\.com$/i.test(new URL(values.linkedin).hostname)) {
    errors.linkedin = MESSAGES.linkedin;
    values.linkedin = '';
  }
  if (values.portfolio) {
    const url = normalizeUrl(values.portfolio);
    if (!url) errors.portfolio = MESSAGES.portfolio;
    else values.portfolio = url;
  }
  if (values.why.length < LIMITS.whyMin) errors.why = MESSAGES.whyShort;
  else if (values.why.length > LIMITS.why) errors.why = MESSAGES.whyLong;
  if (!values.experience) errors.experience = MESSAGES.experience;
  if (requiresOverlap && !values.overlap) errors.overlap = MESSAGES.overlap;
  if (values.salary) {
    if (!/^\$?\s?\d{1,3}(,?\d{3})*$/.test(values.salary)) errors.salary = MESSAGES.salary;
    else values.salary = Number(values.salary.replace(/[^\d]/g, '')).toLocaleString('en-US');
  }
  if (!values.consent) errors.consent = MESSAGES.consent;
  return { values, errors };
}
