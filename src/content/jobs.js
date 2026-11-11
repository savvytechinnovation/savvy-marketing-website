// Open roles — single source of truth for /careers/, /careers/<slug>/ and the
// "Roles we're hiring for" preview on /work-with-us/.
//
// After editing this file run:   node scripts/build-jobs.mjs
// It regenerates careers/<slug>/index.html for every role and refreshes the
// generated blocks in careers/index.html and work-with-us/index.html.
// The generated HTML is committed (static pages = SEO + no layout shift).
//
// Bracketed values ([$X – $Y], [Name]…) are placeholders from the Figma file:
// keep them until the business confirms the real value.

export const CAREERS_UPDATED = '2026-11-10'; // shown as "Updated …" in the Careers hero
export const CAREERS_EMAIL = 'careers@savvypost.com'; // [confirm] fallback for "Email it instead"

/** Filter groups, in display order (the Careers chips + Work With Us team chips). */
export const AREAS = ['Strategy', 'Media', 'Creative', 'Data', 'Operations'];
export const TYPES = ['Full-time', 'Contract', 'Part-time'];
export const LOCATIONS = ['Remote · US hours', 'Remote · Any timezone'];

/** Steps shared by every role; a role can override the case study line. */
const process = (caseStudy = 'Short growth plan, paid · 2 hours') => [
  { title: 'Application', text: 'We read every one', when: '2–3 days' },
  { title: 'Intro call', text: '30 min with [Name], hiring lead', when: 'Week 1' },
  { title: 'Case study', text: caseStudy, when: 'Week 2' },
  { title: 'Team interview', text: 'Meet your pod', when: 'Week 2–3' },
  { title: 'Offer', text: 'References and offer', when: 'Week 3' },
];

const offer = ({ pay = '[$X – $Y] a year, reviewed every 12 months', remote = 'Work from anywhere with US-hours overlap', growth = 'Clear path to Lead / Head of practice' } = {}) => [
  { title: 'Pay', text: pay },
  { title: 'Time off', text: '[X] paid days off plus holidays' },
  { title: 'Learning', text: '[$X] learning budget a year' },
  { title: 'Remote', text: remote },
  { title: 'Equipment', text: 'Laptop and home-office stipend' },
  { title: 'Growth', text: growth },
];

export const JOBS = [
  {
    slug: 'growth-strategist',
    title: 'Growth Strategist',
    area: 'Strategy',
    type: 'Full-time',
    location: 'Remote · US hours',
    postedAt: '2026-11-09',
    closesAt: '2026-12-15',
    summary: 'Own growth plans for 4–6 home service clients, from first audit to monthly reviews in booked jobs and revenue.',
    youllDo: ['Lead discovery calls and write the growth plan', 'Coordinate your pod: media, creative and analytics', 'Report results in booked jobs and revenue'],
    lookFor: ['3+ years in performance marketing', 'Clear writer', 'US hours overlap'],
    skills: ['growth', 'strategy', 'google', 'lsa', 'meta', 'account management', 'planning', 'performance marketing'],
    about:
      "You'll own the growth plan for 4–6 home service companies (HVAC, plumbing, electrical, roofing and cleaning). You lead a small pod of media, creative and analytics specialists and you measure success in booked jobs and revenue, not clicks.",
    responsibilities: [
      'Run discovery: learn how each client books, dispatches and gets paid',
      'Write and own the growth plan, with clear targets per channel',
      'Lead your pod week to week and unblock the work',
      'Present results to owners in booked jobs, revenue and cost per job',
      'Spot what to stop, start and scale every month',
    ],
    requirements: [
      '3+ years in performance marketing, growth or account strategy',
      'Comfortable with Google Ads, LSA and Meta at a strategic level',
      'Clear writer: plans, recaps and hard news',
      'Available at least 4 hours overlapping US Eastern time',
    ],
    niceToHave: ['Experience with home service or local businesses', 'Call tracking and CRM setup (e.g. [ServiceTitan], [CallRail])', 'Spanish or another second language'],
    offer: offer(),
    process: process(),
    facts: { salary: '[$X – $Y] / year', team: 'Strategy pod · reports to [Head of Strategy]', start: '[Month 2026]', hiringTime: 'About 3 weeks' },
    experienceQuestion: 'Years leading paid campaigns or growth plans',
    requiresOverlap: true,
  },
  {
    slug: 'paid-media-specialist-google-lsa',
    title: 'Paid Media Specialist (Google & LSA)',
    area: 'Media',
    type: 'Full-time',
    location: 'Remote · US hours',
    postedAt: '2026-11-06',
    closesAt: '2026-12-15',
    summary: 'Build and run Google Ads and Local Services Ads that fill technician calendars, not just dashboards.',
    youllDo: ['Build and optimize Search, PMax and LSA accounts', 'Tie spend to calls, booked jobs and revenue', 'Test offers and landing pages with your pod'],
    lookFor: ['2+ years managing Google Ads', 'LSA experience', 'US hours overlap'],
    skills: ['google ads', 'lsa', 'local services ads', 'ppc', 'search', 'pmax', 'paid media', 'ads'],
    about:
      "You'll run Google Ads and Local Services Ads for home service companies in one or two industries. You'll know which campaigns turn into booked jobs, and you'll work with the strategist and analyst in your pod to move budget to what works.",
    responsibilities: [
      'Build, launch and optimize Search, Performance Max and LSA campaigns',
      'Track every call and form back to booked jobs with the analytics team',
      'Manage budgets by season: shoulder months, storms and peak demand',
      'Write ad copy and brief landing pages with creative',
      'Report what changed, why, and what you will do next',
    ],
    requirements: [
      '2+ years managing Google Ads accounts with real budgets',
      'Hands-on Local Services Ads experience',
      'Comfortable with conversion tracking, GA4 and call tracking',
      'Available at least 4 hours overlapping US Eastern time',
    ],
    niceToHave: ['Agency experience with several accounts at once', 'Home service or local lead generation background', 'Google Ads certifications'],
    offer: offer({ growth: 'Path to Senior specialist and Lead' }),
    process: process('Account audit exercise, paid · 2 hours'),
    facts: { salary: '[$X – $Y] / year', team: 'Media pod · reports to [Head of Media]', start: '[Month 2026]', hiringTime: 'About 3 weeks' },
    experienceQuestion: 'Years managing Google Ads accounts',
    requiresOverlap: true,
  },
  {
    slug: 'meta-ads-specialist',
    title: 'Meta Ads Specialist',
    area: 'Media',
    type: 'Contract',
    location: 'Remote · US hours',
    postedAt: '2026-11-04',
    closesAt: '2026-12-31',
    summary: 'Run Meta campaigns that create demand for service businesses before customers start searching.',
    youllDo: ['Plan and run Meta campaigns for 3–5 clients', 'Brief and test creative with the creative team', 'Report leads, booked jobs and cost per job'],
    lookFor: ['2+ years running Meta Ads', 'Creative testing', 'US hours overlap'],
    skills: ['meta ads', 'facebook ads', 'instagram', 'paid social', 'creative testing', 'ads'],
    about:
      "You'll plan and run Meta campaigns for home service companies: seasonal offers, maintenance plans and recurring services. It's a contract role with a steady book of clients and the same pod rituals as the rest of the team.",
    responsibilities: [
      'Plan, launch and optimize Meta campaigns for 3–5 clients',
      'Brief creative and run structured tests on hooks, offers and formats',
      'Set up lead forms and hand-offs to each client’s CRM',
      'Report leads, booked jobs and cost per job, not reach',
      'Share what you learn at the Thursday learning session',
    ],
    requirements: [
      '2+ years running Meta Ads for lead generation',
      'A testing habit: hypotheses, results and next steps written down',
      'Comfortable with pixel, Conversions API and lead form setup',
      'Available at least 4 hours overlapping US Eastern time',
    ],
    niceToHave: ['Local or home service businesses', 'Short-form video editing', 'TikTok or YouTube ads'],
    offer: offer({ pay: '[$X] per hour, [X] hours a week', growth: 'Option to move to a full-time role' }),
    process: process('Creative test plan, paid · 2 hours'),
    facts: { salary: '[$X] / hour · contract', team: 'Media pod · reports to [Head of Media]', start: '[Month 2026]', hiringTime: 'About 2 weeks' },
    experienceQuestion: 'Years running Meta Ads',
    requiresOverlap: true,
  },
  {
    slug: 'web-designer-webflow',
    title: 'Web Designer (Webflow)',
    area: 'Creative',
    type: 'Full-time',
    location: 'Remote · Any timezone',
    postedAt: '2026-10-28',
    closesAt: '2026-12-31',
    summary: 'Design and build websites and landing pages in Webflow that turn visitors into booked jobs.',
    youllDo: ['Design sites and landing pages in Figma', 'Build them in Webflow, fast and accessible', 'Test pages with media and analytics'],
    lookFor: ['3+ years in web design', 'Strong Webflow portfolio', 'Conversion mindset'],
    skills: ['webflow', 'figma', 'web design', 'landing pages', 'cro', 'ux', 'design'],
    about:
      "You'll design and build the websites and landing pages our clients' campaigns depend on. You work in Figma and Webflow, and you care about what happens after the click: calls, forms and booked jobs.",
    responsibilities: [
      'Design websites and landing pages in Figma with our design system',
      'Build them in Webflow: responsive, fast and accessible',
      'Run A/B tests on offers, forms and layouts with media and analytics',
      'Keep each client’s brand consistent across pages and ads',
      'Document components so the team can reuse them',
    ],
    requirements: [
      '3+ years designing and building marketing websites',
      'A Webflow portfolio with live sites you designed and built',
      'Solid typography, layout and accessibility basics',
      'Clear async communication in English',
    ],
    niceToHave: ['Home service or local business websites', 'Basic HTML, CSS and JavaScript', 'Motion and micro-interactions'],
    offer: offer({ remote: 'Work from anywhere, async first', growth: 'Path to Senior designer and Creative lead' }),
    process: process('Landing page exercise, paid · 3 hours'),
    facts: { salary: '[$X – $Y] / year', team: 'Creative pod · reports to [Creative Lead]', start: '[Month 2026]', hiringTime: 'About 3 weeks' },
    experienceQuestion: 'Years designing and building websites',
    requiresOverlap: false,
  },
  {
    slug: 'marketing-analyst',
    title: 'Marketing Analyst',
    area: 'Data',
    type: 'Full-time',
    location: 'Remote · US hours',
    postedAt: '2026-10-21',
    closesAt: '2026-12-31',
    summary: 'Connect every call, form and booked job to the campaign that drove it, and turn it into clear reports.',
    youllDo: ['Set up tracking from first click to booked job', 'Build Looker Studio reports owners understand', 'Find where leads leak and why'],
    lookFor: ['2+ years in marketing analytics', 'GA4 + Looker Studio', 'US hours overlap'],
    skills: ['analytics', 'ga4', 'looker studio', 'attribution', 'call tracking', 'sql', 'data', 'reporting'],
    about:
      "You'll make sure every client can see what drives growth. You connect ads, calls, forms and CRM data, build the reports our strategists present, and dig into the numbers when something changes.",
    responsibilities: [
      'Set up and audit tracking: GA4, tags, call tracking and CRM sources',
      'Build and maintain Looker Studio dashboards per client',
      'Reconcile leads with booked jobs and revenue every month',
      'Investigate drops and spikes, and explain them in plain words',
      'Help pods decide where the next dollar should go',
    ],
    requirements: [
      '2+ years in marketing or web analytics',
      'Strong GA4, Google Tag Manager and Looker Studio skills',
      'Comfortable with spreadsheets and basic SQL',
      'Available at least 4 hours overlapping US Eastern time',
    ],
    niceToHave: ['Call tracking tools (e.g. [CallRail])', 'Field service CRMs (e.g. [ServiceTitan], [Jobber])', 'BigQuery or Python'],
    offer: offer({ growth: 'Path to Senior analyst and Head of data' }),
    process: process('Reporting exercise, paid · 2 hours'),
    facts: { salary: '[$X – $Y] / year', team: 'Data pod · reports to [Head of Analytics]', start: '[Month 2026]', hiringTime: 'About 3 weeks' },
    experienceQuestion: 'Years working in marketing analytics',
    requiresOverlap: true,
  },
];

export const jobBySlug = (slug) => JOBS.find((j) => j.slug === slug);
