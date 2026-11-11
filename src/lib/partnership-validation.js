// Explore Partnership — field options and validation.
// Shared by the browser (/explore-partnership/) and the Vercel function (api/partnership.js).
// Fields follow the Figma "Explore Partnership — Flow map v1 · Fields table".
import { EMAIL_RE, INDUSTRIES, INVESTMENTS, STAGES, fitMatrix } from './fit-check.js';

export { INDUSTRIES, INVESTMENTS, STAGES, fitMatrix };

export const ROLES = ['Owner / President', 'General manager', 'Operations', 'Marketing', 'Office manager', 'Other'];
export const SERVE = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'both', label: 'Both' },
  { value: 'short-term-rentals', label: 'Short-term rentals', industry: 'cleaning' },
];
export const GOAL_SUGGESTIONS = ['More booked jobs', 'New service area', 'Fewer slow months', "Know what's working"];
export const CHALLENGES = [
  'Inconsistent leads',
  "Can't tell what's working",
  'Too many disconnected vendors',
  'Missed calls / slow follow-up',
  'Seasonal swings',
  'Entering a new market',
  'Other',
];
export const MARKETING = ['Google Ads', 'Local Services Ads', 'SEO', 'Meta Ads', 'Direct mail', 'Referrals', 'An agency', 'In-house', 'Not much yet'];
export const SOURCES = ['Google search', 'Referral', 'Social media', 'Industry event', 'Email', 'Fit check', 'Other'];
export const BEST_TIMES = ['Mornings', 'Midday', 'Afternoons', 'Any time'];
export const FORMATS = [
  { value: 'video', label: 'Video call' },
  { value: 'phone', label: 'Phone call' },
];

/** Up to 2 optional questions per industry (Figma shows HVAC; the others are placeholders to confirm). */
const VEHICLES = ['1–2', '3–5', '6–10', '11–20', '20+'];
export const INDUSTRY_QUESTIONS = {
  hvac: [
    { id: 'vehicles', label: 'Service vehicles on the road', options: VEHICLES },
    { id: 'plans', label: 'Do you sell maintenance plans?', options: ['No', 'Yes, under 100 members', 'Yes, about 100–500 members', 'Yes, 500+ members'] },
  ],
  plumbing: [
    { id: 'vehicles', label: 'Service vehicles on the road', options: VEHICLES },
    { id: 'emergency', label: 'Do you offer 24/7 emergency service?', options: ['Yes', 'In some areas', 'No'] },
  ],
  electrical: [
    { id: 'vehicles', label: 'Service vehicles on the road', options: VEHICLES },
    { id: 'mix', label: 'Mostly service or new construction?', options: ['Mostly service & repair', 'Mostly new construction', 'A mix of both'] },
  ],
  roofing: [
    { id: 'crews', label: 'Install crews', options: ['1', '2–3', '4–6', '7+'] },
    { id: 'storm', label: 'Do you do storm / insurance work?', options: ['Yes, a lot', 'Some', 'No'] },
  ],
  cleaning: [
    { id: 'team', label: 'Cleaners on the team', options: ['1–5', '6–15', '16–40', '40+'] },
    { id: 'recurring', label: 'Most of your clients are…', options: ['Recurring', 'One-time', 'A mix'] },
  ],
  other: [],
};

/** Which step each field lives on (1 About you · 2 Your business · 3 Pick a time). */
export const FIELD_STEP = {
  name: 1, company: 1, email: 1, phone: 1, website: 1, industry: 1, role: 1,
  serve: 2, stage: 2, goals: 2, challenges: 2, challengeOther: 2, marketing: 2, marketingNotes: 2, investment: 2, industryAnswers: 2, source: 2, smsConsent: 2,
  slot: 3, format: 3, bestTimes: 3, timezone: 3,
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v, allowed) => [...new Set((Array.isArray(v) ? v : []).filter((x) => allowed.includes(x)))];
const bool = (v) => v === true || v === 'on' || v === 'true';
const values = (opts) => opts.map((o) => (typeof o === 'string' ? o : o.value));

/** Accepts "torreshvac.com" or a full URL; returns a normalised https URL or '' when invalid. */
export function normaliseWebsite(v) {
  const raw = str(v, 200);
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) return '';
    return url.href;
  } catch {
    return '';
  }
}

const SLOT_WINDOW_DAYS = 45;

/**
 * Validate the whole enquiry (or only the steps listed in `steps`).
 * @param {object} input raw form data
 * @param {{ steps?: number[], now?: Date }} [opts]
 * @returns {{ values: object, errors: Record<string,string>, outcome: 'fit'|'soft'|'not-yet'|null }}
 */
export function validatePartnership(input = {}, { steps = [1, 2, 3], now = new Date() } = {}) {
  const industry = values(INDUSTRIES).includes(input.industry) ? input.industry : '';
  const iq = INDUSTRY_QUESTIONS[industry] || [];
  const rawIA = input.industryAnswers && typeof input.industryAnswers === 'object' ? input.industryAnswers : {};
  const industryAnswers = Object.fromEntries(iq.filter((q) => q.options.includes(rawIA[q.id])).map((q) => [q.id, rawIA[q.id]]));

  const v = {
    name: str(input.name, 100),
    company: str(input.company, 120),
    email: str(input.email, 150).toLowerCase(),
    phone: str(input.phone, 30),
    website: str(input.website, 200),
    noWebsite: bool(input.noWebsite),
    industry,
    role: ROLES.includes(input.role) ? input.role : '',
    serve: SERVE.some((s) => s.value === input.serve && (!s.industry || s.industry === industry)) ? input.serve : '',
    stage: values(STAGES).includes(input.stage) ? input.stage : '',
    goals: str(input.goals, 2000),
    challenges: list(input.challenges, CHALLENGES),
    challengeOther: str(input.challengeOther, 300),
    marketing: list(input.marketing, MARKETING),
    marketingNotes: str(input.marketingNotes, 1000),
    investment: values(INVESTMENTS).includes(input.investment) ? input.investment : '',
    industryAnswers,
    source: SOURCES.includes(input.source) ? input.source : '',
    smsConsent: bool(input.smsConsent),
    noTimes: bool(input.noTimes),
    slot: str(input.slot, 40),
    format: values(FORMATS).includes(input.format) ? input.format : '',
    bestTimes: list(input.bestTimes, BEST_TIMES),
    timezone: str(input.timezone, 60),
    requestReview: bool(input.requestReview),
  };

  const errors = {};
  if (steps.includes(1)) {
    if (v.name.length < 2) errors.name = 'Please tell us your full name.';
    if (v.company.length < 2) errors.company = 'Please add your company name.';
    if (!EMAIL_RE.test(v.email)) errors.email = 'Please enter a valid email, e.g. name@company.com.';
    const digits = v.phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15 || /[^\d\s()+.\-]/.test(v.phone)) errors.phone = 'Please enter a phone number we can call, e.g. (555) 214-8890.';
    if (v.noWebsite) v.website = '';
    else if (v.website) {
      const url = normaliseWebsite(v.website);
      if (url) v.website = url;
      else errors.website = 'That doesn\'t look like a web address, e.g. yourcompany.com.';
    }
    if (!v.industry) errors.industry = 'Please pick your industry.';
  }
  if (steps.includes(2)) {
    if (!v.serve) errors.serve = 'Please pick who you serve.';
    if (!v.stage) errors.stage = 'Please pick where the business is today.';
    if (v.goals.length < 10) errors.goals = 'A sentence about your goals (10+ characters) helps us prepare.';
    if (!v.challenges.length) errors.challenges = "Pick at least one thing that's getting in the way.";
    else if (v.challenges.includes('Other') && v.challengeOther.length < 2) errors.challengeOther = 'Tell us briefly what else is in the way.';
    if (!v.investment) errors.investment = 'Please pick a range. "Not sure" is fine.';
  }

  const outcome = fitMatrix(v.stage, v.investment);

  // Step 3 is only required when the fit check offers a calendar.
  if (steps.includes(3) && outcome && outcome !== 'not-yet') {
    if (v.noTimes) {
      if (!v.bestTimes.length) errors.bestTimes = 'Pick when you are usually free.';
      v.slot = '';
    } else {
      const t = Date.parse(v.slot);
      if (!v.slot || Number.isNaN(t)) errors.slot = 'Please pick a time for the call.';
      else if (t < now.getTime() || t > now.getTime() + SLOT_WINDOW_DAYS * 864e5) errors.slot = 'That time is no longer available. Please pick another.';
      else v.slot = new Date(t).toISOString();
      if (!v.format) errors.format = 'Please choose video or phone.';
    }
  }

  return { values: v, errors, outcome };
}

/** First step (1–3) that has an error, or 0. */
export const firstErrorStep = (errors) => Math.min(...Object.keys(errors).map((k) => FIELD_STEP[k] || 3), 99) % 99;
