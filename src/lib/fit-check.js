// Fit Check — questions, scoring model and lead validation.
// Shared by the browser (/are-we-a-fit/, /explore-partnership/) and the Vercel functions
// (api/fit-check.js, api/partnership.js) so both sides apply exactly the same rules.
//
// Two layers, both deterministic and documented here so the team can tune them:
//   1. FIT MATRIX (Figma "Explore Partnership — Flow map v1 · Fit matrix"): stage × monthly investment
//      → 'fit' (45–60 min consultation) | 'soft' (30 min intro call) | 'not-yet' (resources, no calendar).
//      Only one cell excludes automatically (just getting started + under $2k); "Not sure" never excludes.
//   2. FIT SCORE (0–100) from the 2-minute fit check answers, using WEIGHTS below, plus
//      BLOCKERS that mirror the Home's "Not the right fit yet if…" criteria.

export const INDUSTRIES = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
];

export const STAGES = [
  { value: 'starting', label: 'Just getting started', hint: 'Still shaping services, under ~1 year' },
  { value: 'growing', label: 'Growing', hint: 'Steady customers, small team' },
  { value: 'established', label: 'Established', hint: 'Team and systems in place' },
  { value: 'scaling', label: 'Scaling', hint: 'Adding crews, vehicles or markets' },
];

export const INVESTMENTS = [
  { value: 'under-2k', label: 'Under $2k' },
  { value: '2k-5k', label: '$2k–5k' },
  { value: '5k-10k', label: '$5k–10k' },
  { value: '10k-plus', label: '$10k+' },
  { value: 'not-sure', label: 'Not sure' },
];

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'not-sure', label: 'Not sure' },
  { value: 'not-yet', label: 'Not yet' },
];

/** Stage × investment → outcome (Figma fit matrix). Thresholds are placeholders to confirm with the team. */
export const FIT_MATRIX = {
  starting: { 'under-2k': 'not-yet', '2k-5k': 'soft', '5k-10k': 'soft', '10k-plus': 'soft', 'not-sure': 'soft' },
  growing: { 'under-2k': 'soft', '2k-5k': 'fit', '5k-10k': 'fit', '10k-plus': 'fit', 'not-sure': 'fit' },
  established: { 'under-2k': 'soft', '2k-5k': 'fit', '5k-10k': 'fit', '10k-plus': 'fit', 'not-sure': 'fit' },
  scaling: { 'under-2k': 'soft', '2k-5k': 'fit', '5k-10k': 'fit', '10k-plus': 'fit', 'not-sure': 'fit' },
};

/** @returns {'fit'|'soft'|'not-yet'|null} */
export const fitMatrix = (stage, investment) => FIT_MATRIX[stage]?.[investment] ?? null;

/** The 2-minute fit check: one question per step. `key` is the shortcut digit shown on each option. */
export const QUESTIONS = [
  { id: 'industry', title: 'Which industry are you in?', hint: 'We only work with five service industries, so we know your customers.', options: INDUSTRIES },
  { id: 'stage', title: 'Where is the business today?', hint: 'Maturity matters more to us than size.', options: STAGES },
  {
    id: 'investment',
    title: 'About how much do you invest in marketing per month?',
    hint: 'Why we ask: it tells us which options are realistic for you. Ads spend + agencies + tools.',
    options: INVESTMENTS,
  },
  { id: 'proven', title: 'Do you have a proven service and real customers?', options: YES_NO },
  { id: 'capacity', title: 'Can your crews take on more work in the next 90 days?', options: YES_NO },
  { id: 'data', title: 'Can you share access to your CRM and ad accounts?', hint: "No CRM or call tracking yet? That's fine: we set them up during Build.", options: YES_NO },
  { id: 'decision', title: 'Is one person able to approve priorities monthly?', options: YES_NO },
  {
    id: 'markets',
    title: 'How many markets do you serve?',
    hint: 'A market is a city or service area with its own competition.',
    options: [
      { value: '1', label: '1' },
      { value: '2-3', label: '2–3' },
      { value: '4-plus', label: '4+' },
    ],
  },
  {
    id: 'intent',
    title: 'What are you looking for right now?',
    options: [
      { value: 'partner', label: 'A long-term partner for steady growth' },
      { value: 'spike', label: 'A quick spike in leads' },
      { value: 'task', label: 'Help with a specific task or campaign' },
      { value: 'cheapest', label: 'The lowest-cost option' },
    ],
  },
];

/**
 * Score weights (max 100). Each answer adds its points; the total is the fit score.
 * stage 20 · investment 15 · proven 15 · capacity 15 · data 10 · decision 10 · intent 10 · markets 5
 */
export const WEIGHTS = {
  stage: { starting: 0, growing: 15, established: 20, scaling: 20 },
  investment: { 'under-2k': 0, '2k-5k': 12, '5k-10k': 15, '10k-plus': 15, 'not-sure': 6 },
  proven: { yes: 15, 'not-sure': 7, 'not-yet': 0 },
  capacity: { yes: 15, 'not-sure': 8, 'not-yet': 0 },
  data: { yes: 10, 'not-sure': 5, 'not-yet': 3 }, // we can set tracking up, so "not yet" is not zero
  decision: { yes: 10, 'not-sure': 5, 'not-yet': 0 },
  intent: { partner: 10, task: 3, spike: 2, cheapest: 0 },
  markets: { 1: 3, '2-3': 5, '4-plus': 5 },
  industry: { hvac: 0, plumbing: 0, electrical: 0, roofing: 0, cleaning: 0, other: 0 }, // personalises, never scores
};

/** A strong fit needs the matrix to say 'fit', no caps, and at least this score. */
export const STRONG_FIT_MIN_SCORE = 70;

/** The six "A strong fit if you…" signs from section 02, derived from the answers. */
export const SIGNS = [
  { id: 'proven', label: 'Proven service and an existing customer base', test: (a) => a.proven === 'yes' && a.stage !== 'starting' },
  { id: 'invest', label: 'Already investing in marketing', test: (a) => ['2k-5k', '5k-10k', '10k-plus'].includes(a.investment) },
  { id: 'capacity', label: 'Capacity for more work', test: (a) => a.capacity === 'yes' },
  { id: 'sustainable', label: 'Looking for sustainable growth, not a quick spike', test: (a) => a.intent === 'partner' || a.intent === 'task' },
  { id: 'measure', label: 'Ready to measure results', test: (a) => a.data === 'yes' },
  { id: 'partner', label: 'Wants a long-term partner, not one-off tasks', test: (a) => a.intent === 'partner' },
];

/** Blockers mirror "Not the right fit yet if you…" (Home + section 02). Any one → 'not-yet'. */
const BLOCKERS = [
  { id: 'defining', test: (a) => a.proven === 'not-yet' || fitMatrix(a.stage, a.investment) === 'not-yet' },
  { id: 'no-capacity', test: (a) => a.capacity === 'not-yet' },
  { id: 'cheapest', test: (a) => a.intent === 'cheapest' },
];

/** Caps keep a high score at "Possible fit" (a conversation first). */
const CAPS = [
  { id: 'one-off', test: (a) => a.intent === 'task' },
  { id: 'quick-spike', test: (a) => a.intent === 'spike' },
  { id: 'other-industry', test: (a) => a.industry === 'other' },
  { id: 'matrix-soft', test: (a) => fitMatrix(a.stage, a.investment) === 'soft' },
];

/** Validate raw answers: every question needs one of its option values. */
export function validateAnswers(input = {}) {
  const answers = {};
  const errors = {};
  for (const q of QUESTIONS) {
    const v = typeof input[q.id] === 'string' ? input[q.id] : String(input[q.id] ?? '');
    if (q.options.some((o) => o.value === v)) answers[q.id] = v;
    else errors[q.id] = 'Please pick an answer.';
  }
  return { answers, errors };
}

const labelOf = (id, value) => QUESTIONS.find((q) => q.id === id)?.options.find((o) => o.value === value)?.label ?? '';

/**
 * Score a complete set of answers.
 * @returns {{ outcome: 'strong'|'possible'|'not-yet', label: string, score: number, matrix: string|null,
 *   signs: string[], blockers: string[], caps: string[], strengths: {id,text}[], gaps: {id,text}[], requirements: number }}
 */
export function scoreFitCheck(raw) {
  const { answers: a, errors } = validateAnswers(raw);
  if (Object.keys(errors).length) throw new Error(`Incomplete answers: ${Object.keys(errors).join(', ')}`);

  const score = Object.entries(WEIGHTS).reduce((sum, [id, table]) => sum + (table[a[id]] ?? 0), 0);
  const matrix = fitMatrix(a.stage, a.investment);
  const signs = SIGNS.filter((s) => s.test(a)).map((s) => s.id);
  const blockers = BLOCKERS.filter((b) => b.test(a)).map((b) => b.id);
  const caps = CAPS.filter((c) => c.test(a)).map((c) => c.id);

  let outcome = 'possible';
  if (blockers.length) outcome = 'not-yet';
  else if (matrix === 'fit' && !caps.length && score >= STRONG_FIT_MIN_SCORE) outcome = 'strong';

  const industry = a.industry === 'other' ? 'service' : labelOf('industry', a.industry);
  const strengths = [];
  const gaps = [];
  if (a.stage === 'established' || a.stage === 'scaling')
    strengths.push({ id: 'stage', text: `You're ${a.stage === 'scaling' ? 'scaling, adding crews, vehicles or markets' : 'established, with a team and systems in place'}: the stage our system is built for.` });
  else if (a.stage === 'growing') strengths.push({ id: 'stage', text: 'You have steady customers and a small team, a solid base to build demand on.' });
  else gaps.push({ id: 'stage', text: "You're still shaping your services. A clear offer comes first; marketing amplifies what already works." });

  if (a.proven === 'yes') strengths.push({ id: 'proven', text: 'Your service is proven and you already have customers.' });
  else if (a.proven === 'not-yet') gaps.push({ id: 'proven', text: "You're still defining what you sell or who you serve. Nail that first and marketing has something to amplify." });
  else gaps.push({ id: 'proven', text: "You're not sure your service is proven yet. We'll look at your customer base together on the call." });

  if (['2k-5k', '5k-10k', '10k-plus'].includes(a.investment)) strengths.push({ id: 'investment', text: `You already invest ${labelOf('investment', a.investment)} a month, so we can connect and measure what's there.` });
  else if (a.investment === 'under-2k') gaps.push({ id: 'investment', text: 'Under $2k a month leaves little room for a full system. Free resources will stretch that budget further for now.' });

  if (a.capacity === 'yes') strengths.push({ id: 'capacity', text: 'Your crews can take on more work, so new demand turns into revenue.' });
  else if (a.capacity === 'not-yet') gaps.push({ id: 'capacity', text: "You can't take on more work right now. Booked out? We plan demand around the crews you have, or help you add capacity first." });
  else gaps.push({ id: 'capacity', text: 'Capacity is uncertain. We plan demand around the crews you have, so growth never outruns your schedule.' });

  if (a.data === 'yes') strengths.push({ id: 'data', text: 'You can share CRM and ad account access, so every result can be measured.' });
  else gaps.push({ id: 'data', text: 'No CRM or call tracking yet? We set them up during Build, so this is a step, not a blocker.' });

  if (a.decision === 'yes') strengths.push({ id: 'decision', text: 'One decision-maker can approve priorities in a 30-minute monthly review.' });
  else gaps.push({ id: 'decision', text: 'Someone needs to approve priorities monthly. We keep reviews to 30 minutes and send the agenda ahead.' });

  if (a.markets !== '1') strengths.push({ id: 'markets', text: `With ${labelOf('markets', a.markets)} markets you need local strategies, not one plan copied between markets. That's our specialty.` });

  if (a.intent === 'partner') strengths.push({ id: 'intent', text: "You want a long-term partner, which is how systems compound." });
  else if (a.intent === 'cheapest') gaps.push({ id: 'intent', text: "You're mainly looking for the lowest-cost option. We're rarely the cheapest; we focus on measurable revenue, not volume of tasks." });
  else if (a.intent === 'task') gaps.push({ id: 'intent', text: 'You need help with a specific task. We work best as one connected system, not isolated tasks without a broader strategy.' });
  else gaps.push({ id: 'intent', text: 'A quick spike in leads rarely lasts. We build sustainable growth that compounds over months.' });

  if (a.industry === 'other') gaps.push({ id: 'industry', text: "We specialize in HVAC, plumbing, electrical, roofing and cleaning. We'll tell you honestly if we can help outside them." });

  const label = { strong: 'Strong fit', possible: 'Possible fit', 'not-yet': 'Not the right fit yet' }[outcome];
  const requirements = ['capacity', 'data', 'decision'].filter((k) => a[k] !== 'yes').length;
  return { outcome, label, score, matrix, signs, blockers, caps, strengths, gaps, requirements, industry };
}

// ---------------------------------------------------------------------------
// "Email me my results" lead (api/fit-check.js)
// ---------------------------------------------------------------------------
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** @returns {{ values: {name,email,consent,answers}, errors: Record<string,string> }} */
export function validateFitCheckLead(input = {}) {
  const { answers, errors: answerErrors } = validateAnswers(input.answers && typeof input.answers === 'object' ? input.answers : {});
  const values = {
    name: str(input.name, 100),
    email: str(input.email, 150).toLowerCase(),
    consent: input.consent === true || input.consent === 'on' || input.consent === 'true',
    answers,
  };
  const errors = {};
  if (values.name.length < 2) errors.name = 'Please tell us your name.';
  if (!EMAIL_RE.test(values.email)) errors.email = 'Please enter a valid email address.';
  if (!values.consent) errors.consent = 'Please confirm we can email you your results.';
  if (Object.keys(answerErrors).length) errors.answers = 'Please answer every question first.';
  return { values, errors };
}

export const answerLabel = labelOf;
