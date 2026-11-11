// Case studies — single source of truth for /results/ and every /results/<slug>/ page.
//
// Figma: "Results (Portfolio)" (Hub A, 5894:3208) + "Study Case (Template)" (5924:1794), content model in
// section D of the Results structure map. After editing this file run:
//
//     node scripts/build-cases.mjs
//
// which regenerates results/<slug>/index.html for every case and the static card grid inside results/index.html.
//
// IMPORTANT — honesty rules (structure map, section F):
//   • No real client results exist yet. Every client name, location and number below is a [bracketed placeholder].
//     Replace them only with real, client-approved figures.
//   • A metric value that is a Number animates as a counter (e.g. after: 61). A String (e.g. '[61]') is shown as-is.
//   • Card / headline results must be 'crm' (Measured in CRM) or 'platform' (Platform-reported), never 'estimated'.
//   • Charts flagged `illustrative: true` show placeholder shapes and say so on the page.

export const INDUSTRIES = [
  { id: 'hvac', label: 'HVAC', page: '/industries/hvac/' },
  { id: 'plumbing', label: 'Plumbing', page: '/industries/plumbing/' },
  { id: 'electrical', label: 'Electrical', page: '/industries/electrical/' },
  { id: 'roofing', label: 'Roofing', page: '/industries/roofing/' },
  { id: 'cleaning', label: 'Cleaning', page: '/industries/cleaning/' },
];

export const TYPES = [
  { id: 'residential', label: 'Residential' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'str', label: 'Short-term rental', only: ['cleaning'] }, // only offered for All / Cleaning
];

export const STAGES = [
  { id: 'strategy', label: 'Strategy' },
  { id: 'build', label: 'Build' },
  { id: 'generate', label: 'Generate' },
  { id: 'convert', label: 'Convert' },
  { id: 'measure', label: 'Measure' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'grow', label: 'Grow' },
];

export const CONFIDENCE = {
  crm: { label: 'Measured in CRM', short: 'Jobs and revenue from the client’s own CRM', headline: true },
  platform: { label: 'Platform-reported', short: 'From ad, call-tracking or review platforms', headline: true },
  estimated: { label: 'Estimated', short: 'Modelled or partial data. Only inside the case, with a one-line explanation', headline: false },
};

/** Builds the bracketed copy for a case whose story has not been written yet. */
const pending = (what) => `[${what}]`;

const genericApproach = (stages) =>
  Object.fromEntries(
    stages.map((id, i) => [
      id,
      {
        when: `Months [${i + 1}–${i + 3}]`,
        text: pending(`What we did in ${STAGES.find((s) => s.id === id).label}, the systems we set up and when`),
        tools: ['[Tool]', '[System]'],
      },
    ]),
  );

const genericCase = (c) => ({
  intro: 'Nothing here is a new trick. We connected the pieces that were working alone. Explore the system below.',
  challenge: {
    quote: pending('The owner’s challenge, in their own words'),
    body: pending('What was at stake before we started: the trucks, crews or new location, and the “before” numbers'),
  },
  approach: genericApproach(c.stages),
  lessons: {
    worked: pending('What worked, in one or two sentences'),
    didnt: pending('What didn’t, and when we stopped it'),
    next: pending('What we changed next'),
  },
  quote: null, // block hides when there is no owner quote
  ...c,
});

export const CASES = [
  {
    slug: 'hvac-booked-jobs',
    status: 'published',
    published: '2026-10-01',
    featured: true,
    industry: 'hvac',
    types: ['residential', 'commercial'],
    location: '[City, ST]',
    size: '[N] trucks',
    client: { name: '[Client name]', anonymized: 'Residential + commercial HVAC, [N] trucks' },
    stages: ['generate', 'convert', 'measure'],
    headline: '[Before] → [After] booked jobs a week',
    title: 'Booked jobs a week, in [N] months.',
    confidence: 'crm',
    period: '[N] months',
    range: '[Jan–Sep 2026]',
    intro: 'Nothing here is a new trick. We connected 7 pieces that were working alone. Explore the system below.',
    challenge: {
      quote: '“[We were about to buy two more trucks with no idea if we could keep them busy.]”',
      body: '[Client name] had grown on referrals and a busy summer. But leads came in waves: slammed in July, quiet in October. Three vendors ran ads, the website and the phones, and nobody could connect a call to a booked job. With two trucks on order, the owner needed demand they could plan around.',
    },
    approach: {
      generate: {
        when: 'Months 1–3',
        text: 'Rebuilt Google Ads and Local Services Ads around booked jobs, not calls. Paused two campaigns that sent tune-up shoppers; added a maintenance-plan offer for the shoulder seasons.',
        tools: ['Google Ads', 'LSA', 'Landing pages'],
      },
      convert: {
        when: 'Months 2–4',
        text: 'Missed-call text-back in under 60 seconds, a 2-step follow-up for unbooked estimates, and a script for the CSR team. Calls now land in one inbox.',
        tools: ['GHL', 'Call tracking', 'CSR script'],
      },
      measure: {
        when: 'Months 3–9',
        text: 'One dashboard from call to booked job to invoice, connected to their field-service software, reviewed together every two weeks.',
        tools: ['GHL reporting', 'ServiceTitan sync', 'Bi-weekly review'],
      },
    },
    results: {
      intro: '[Jan–Sep 2026] compared with the same months of [2025].',
      metrics: [
        {
          label: 'Booked jobs / week',
          before: '[X]',
          after: '[Y]',
          confidence: 'crm',
          method: {
            source: '[Client name]’s CRM ([field-service software]), synced to GHL',
            counts: 'Jobs with status “Booked”, weekly average. Warranty callbacks excluded.',
            period: '[Jan–Sep 2026] vs. [Jan–Sep 2025] (same months, to remove seasonality)',
          },
        },
        {
          label: 'Calls missed',
          before: '[X%]',
          after: '[Y%]',
          confidence: 'platform',
          method: {
            source: 'Call-tracking platform',
            counts: 'Inbound calls not answered by a person or returned within 5 minutes.',
            period: '[Jan–Sep 2026] vs. [Jan–Sep 2025]',
          },
        },
        {
          label: 'Cost per booked job',
          before: '[$X]',
          after: '[$Y]',
          confidence: 'crm',
          method: {
            source: 'Ad spend from Google Ads + LSA, booked jobs from the CRM',
            counts: 'Total paid media spend divided by booked jobs from paid sources.',
            period: '[Jan–Sep 2026] vs. [Jan–Sep 2025]',
          },
        },
        {
          label: 'Maintenance members',
          before: '[X]',
          after: '[Y]',
          confidence: 'crm',
          method: {
            source: 'Membership list in the CRM',
            counts: 'Active paid maintenance-plan members at the end of the period.',
            period: 'End of [Sep 2025] vs. end of [Sep 2026]',
          },
        },
      ],
      chart: {
        kind: 'monthly',
        title: 'Booked jobs per week, by month',
        unit: 'booked jobs / week',
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        series: [
          { name: '[2025]', values: [36, 36, 33, 35, 39, 44, 52, 55, 41] },
          { name: '[2026] (with Savvy)', values: [40, 40, 42, 47, 52, 58, 66, 68, 60] },
        ],
        caption: 'Jan → Sep (each pair: [2025] left, [2026] right)',
        illustrative: true,
      },
    },
    lessons: {
      worked: 'Answering every call fast did more than any new campaign. Text-back alone recovered [~N] jobs a week.',
      didnt: 'A Facebook test for tune-ups brought cheap leads that rarely booked. We stopped it after [N] weeks.',
      next: 'Moved budget to maintenance plans before the fall, so October stayed busy for the first time.',
    },
    quote: {
      text: '“[Owner quote: what changed for the business, in their own words.]”',
      name: '[Owner name]',
      role: 'Owner, [Client name]',
    },
  },
  genericCase({
    slug: 'plumbing-cost-per-booked-job',
    status: 'published',
    published: '2026-09-15',
    featured: true,
    industry: 'plumbing',
    types: ['residential'],
    location: '[City, ST]',
    size: '[N] techs',
    client: { name: '[Client name]', anonymized: 'Residential plumbing, [N] techs' },
    stages: ['generate', 'optimize'],
    headline: 'Cost per booked job: [$X] → [$Y]',
    title: 'Cost per booked job, in [N] months.',
    confidence: 'crm',
    period: '[N] months',
    range: '[Period]',
    results: {
      intro: '[Period] compared with the same months of the previous year.',
      metrics: [
        { label: 'Cost per booked job', before: '[$X]', after: '[$Y]', confidence: 'crm', method: { source: '[Ad platforms + CRM]', counts: '[What counts as a booked job]', period: '[Period] vs. [same months, previous year]' } },
        { label: 'Booked jobs / month', before: '[X]', after: '[Y]', confidence: 'crm', method: { source: '[CRM]', counts: '[Definition]', period: '[Period]' } },
      ],
      chart: {
        kind: 'funnel',
        title: 'From lead to booked job',
        unit: 'per month',
        labels: ['Leads', 'Answered', 'Quoted', 'Booked'],
        series: [
          { name: 'Before', values: [100, 72, 48, 30] },
          { name: 'After', values: [100, 92, 66, 47] },
        ],
        caption: 'Each step as a share of leads (before vs. after)',
        illustrative: true,
      },
    },
  }),
  genericCase({
    slug: 'electrical-commercial-bids',
    status: 'published',
    published: '2026-08-20',
    featured: true,
    industry: 'electrical',
    types: ['commercial'],
    location: '[City, ST]',
    size: '[N] electricians',
    client: { name: '[Client name]', anonymized: 'Commercial electrical, [N] electricians' },
    stages: ['strategy', 'generate'],
    headline: '[N] qualified bids a quarter, up from [N]',
    title: 'Qualified bids a quarter, in [N] months.',
    confidence: 'platform',
    period: '[N] months',
    range: '[Period]',
    results: {
      intro: '[Period] compared with the same months of the previous year.',
      metrics: [
        { label: 'Qualified bids / quarter', before: '[X]', after: '[Y]', confidence: 'platform', method: { source: '[Bid platform / call tracking]', counts: '[What makes a bid qualified]', period: '[Period]' } },
        { label: 'Win rate', before: '[X%]', after: '[Y%]', confidence: 'crm', method: { source: '[CRM]', counts: '[Definition]', period: '[Period]' } },
      ],
      chart: {
        kind: 'funnel',
        title: 'From enquiry to qualified bid',
        unit: 'per quarter',
        labels: ['Enquiries', 'Site visits', 'Bids sent', 'Qualified'],
        series: [
          { name: 'Before', values: [100, 54, 40, 22] },
          { name: 'After', values: [100, 70, 58, 44] },
        ],
        caption: 'Each step as a share of enquiries (before vs. after)',
        illustrative: true,
      },
    },
  }),
  genericCase({
    slug: 'roofing-booked-replacements',
    status: 'published',
    published: '2026-07-30',
    featured: true,
    industry: 'roofing',
    types: ['residential'],
    location: '[City, ST]',
    size: '[N] crews',
    client: { name: '[Client name]', anonymized: 'Residential roofing, [N] crews' },
    stages: ['generate', 'convert', 'grow'],
    headline: '[$X] in booked roof replacements',
    title: 'Booked roof replacements, in [N] months.',
    confidence: 'crm',
    period: '[N] months',
    range: '[Period]',
    results: {
      intro: '[Period] compared with the same months of the previous year.',
      metrics: [
        { label: 'Booked replacements', before: '[$X]', after: '[$Y]', confidence: 'crm', method: { source: '[CRM]', counts: '[Signed replacement contracts]', period: '[Period]' } },
        { label: 'Inspections booked', before: '[X]', after: '[Y]', confidence: 'crm', method: { source: '[CRM]', counts: '[Definition]', period: '[Period]' } },
      ],
      chart: {
        kind: 'monthly',
        title: 'Inspections booked, by month',
        unit: 'inspections',
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        series: [
          { name: 'Before', values: [18, 16, 22, 26, 30, 28] },
          { name: 'With Savvy', values: [22, 24, 31, 37, 42, 40] },
        ],
        caption: 'Each pair: before left, with Savvy right',
        illustrative: true,
      },
    },
  }),
  genericCase({
    slug: 'cleaning-recurring-clients',
    status: 'published',
    published: '2026-06-18',
    featured: true,
    industry: 'cleaning',
    types: ['residential', 'str'],
    location: '[City, ST]',
    size: '[N] crews',
    client: { name: '[Client name]', anonymized: 'Residential cleaning, [N] crews' },
    stages: ['build', 'convert', 'grow'],
    headline: 'Recurring clients: [X] → [Y]',
    title: 'Recurring clients, in [N] months.',
    confidence: 'crm',
    period: '[N] months',
    range: '[Period]',
    results: {
      intro: '[Period] compared with the same months of the previous year.',
      metrics: [
        { label: 'Recurring clients', before: '[X]', after: '[Y]', confidence: 'crm', method: { source: '[Booking software]', counts: '[Clients on a weekly, bi-weekly or monthly plan]', period: '[Period]' } },
        { label: 'Quote-to-booking rate', before: '[X%]', after: '[Y%]', confidence: 'crm', method: { source: '[CRM]', counts: '[Definition]', period: '[Period]' } },
      ],
      chart: {
        kind: 'funnel',
        title: 'From quote request to recurring client',
        unit: 'per month',
        labels: ['Quote requests', 'Quotes sent', 'First clean', 'Recurring'],
        series: [
          { name: 'Before', values: [100, 80, 38, 20] },
          { name: 'After', values: [100, 94, 52, 34] },
        ],
        caption: 'Each step as a share of quote requests (before vs. after)',
        illustrative: true,
      },
    },
  }),
  genericCase({
    slug: 'hvac-missed-calls',
    status: 'published',
    published: '2026-05-12',
    featured: false,
    industry: 'hvac',
    types: ['residential'],
    location: '[City, ST]',
    size: '[N] trucks',
    client: { name: null, anonymized: 'Residential HVAC, [N] trucks (anonymized)' },
    stages: ['convert', 'measure'],
    headline: 'Missed calls down from [X%] to [Y%]',
    title: 'Missed calls, in [N] months.',
    confidence: 'platform',
    period: '[N] months',
    range: '[Period]',
    results: {
      intro: '[Period] compared with the same months of the previous year.',
      metrics: [
        { label: 'Calls missed', before: '[X%]', after: '[Y%]', confidence: 'platform', method: { source: '[Call-tracking platform]', counts: 'Inbound calls not answered by a person or returned within 5 minutes.', period: '[Period]' } },
        { label: 'Booked from calls', before: '[X%]', after: '[Y%]', confidence: 'crm', method: { source: '[CRM]', counts: '[Definition]', period: '[Period]' } },
      ],
      chart: {
        kind: 'funnel',
        title: 'From inbound call to booked job',
        unit: 'per month',
        labels: ['Inbound calls', 'Answered', 'Qualified', 'Booked'],
        series: [
          { name: 'Before', values: [100, 69, 52, 34] },
          { name: 'After', values: [100, 94, 70, 49] },
        ],
        caption: 'Each step as a share of inbound calls (before vs. after)',
        illustrative: true,
      },
    },
  }),
];

/** Newest first — the order used by the hub grid and the prev/next navigation. */
export const sortedCases = () => [...CASES].filter((c) => c.status !== 'draft').sort((a, b) => b.published.localeCompare(a.published));

export const industryOf = (id) => INDUSTRIES.find((i) => i.id === id);
export const typeLabel = (id) => TYPES.find((t) => t.id === id)?.label ?? id;
export const stageLabel = (id) => STAGES.find((s) => s.id === id)?.label ?? id;
export const clientLabel = (c) => c.client.name || c.client.anonymized;
