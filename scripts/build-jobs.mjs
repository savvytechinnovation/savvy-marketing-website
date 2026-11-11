#!/usr/bin/env node
// Generate the careers pages from src/content/jobs.js (no dependencies).
//
//   node scripts/build-jobs.mjs            # write files
//   node scripts/build-jobs.mjs --check    # exit 1 if any generated file is out of date (CI)
//
// Writes / updates (all committed, so the pages are static HTML for SEO):
//   careers/<slug>/index.html                       one page per role (Figma "Job Detail" template)
//   careers/index.html       between <!-- jobs:careers-*:start/end --> markers (stats, filters, list)
//   work-with-us/index.html  between <!-- jobs:wwu-roles:start/end -->           (roles preview)
//   who-we-are/index.html    between <!-- jobs:wwa-careers:start/end -->         (Careers card)
// "Posted <date>" is static (deterministic output); the page JS turns it into "Posted 2 days ago".
// Stale careers/<slug>/ folders of roles that were removed from jobs.js are reported (not deleted).
// Vite picks the new pages up automatically (every */index.html is a page). Run it before `npm run build`.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AREAS, CAREERS_EMAIL, CAREERS_UPDATED, JOBS, LOCATIONS, TYPES } from '../src/content/jobs.js';
import { CV_ACCEPT, EXPERIENCE, HEARD_FROM, TIMEZONES, WORK_AUTH } from '../src/lib/application-validation.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const SITE_URL = (process.env.SITE_URL || 'https://www.savvypost.com').replace(/\/$/, ''); // [confirm production domain]

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fmtDate = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const byNewest = [...JOBS].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
const count = (key, value) => JOBS.filter((j) => j[key] === value).length;
const arrow = (cls = '') => `<img${cls} src="/ds/icons/arrow-right.svg" alt="" width="16" height="16" />`;
const btnIcon = '<span class="btn__icon"><img src="/ds/icons/arrow-up-right.svg" alt="" width="20" height="20" /></span>';

let changed = 0;
let stale = 0;
function write(file, content) {
  const abs = join(root, file);
  const prev = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  if (prev === content) return;
  changed++;
  if (CHECK) return void console.log(`out of date: ${file}`);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  console.log(`wrote ${file}`);
}

/** Replace the content between <!-- jobs:name:start --> and <!-- jobs:name:end --> (keeps indentation). */
function inject(file, blocks) {
  const abs = join(root, file);
  let html = readFileSync(abs, 'utf8');
  for (const [name, content] of Object.entries(blocks)) {
    const re = new RegExp(`([ \\t]*)<!-- jobs:${name}:start -->[\\s\\S]*?<!-- jobs:${name}:end -->`);
    const m = html.match(re);
    if (!m) throw new Error(`${file}: missing <!-- jobs:${name}:start/end --> markers`);
    const pad = m[1];
    const body = content
      .trim()
      .split('\n')
      .map((l) => (l ? pad + l : l))
      .join('\n');
    html = html.replace(re, () => `${pad}<!-- jobs:${name}:start -->\n${body}\n${pad}<!-- jobs:${name}:end -->`);
  }
  write(file, html);
}

// ---------------------------------------------------------------------------
// Careers listing blocks
// ---------------------------------------------------------------------------
const chip = (group, value, label, n) =>
  `<button class="chip" type="button" aria-pressed="${value === 'all' ? 'true' : 'false'}" data-group="${group}" data-value="${esc(value)}"${n === 0 ? ' aria-disabled="true" title="No roles right now"' : ''}>${esc(label)} <span class="chip__count" data-count-for="${esc(value)}">${n}</span></button>`;

const careersStats = `
<dl class="car-hero__stats">
  <div><dt>open roles</dt><dd>${JOBS.length}</dd></div>
  <div><dt>teams hiring</dt><dd>${new Set(JOBS.map((j) => j.area)).size}</dd></div>
  <div><dt>remote-friendly</dt><dd>${Math.round((JOBS.filter((j) => j.location.startsWith('Remote')).length / Math.max(1, JOBS.length)) * 100)}%</dd></div>
</dl>
<p class="car-hero__updated">Updated <time datetime="${CAREERS_UPDATED}">${fmtDate(CAREERS_UPDATED)}</time></p>`;

const careersFilters = `
<div class="filters__group" role="group" aria-labelledby="flt-area">
  <span class="filters__label" id="flt-area">Area</span>
  <div class="chips">
    ${chip('area', 'all', 'All', JOBS.length)}
${AREAS.filter((a) => count('area', a) > 0)
  .map((a) => `    ${chip('area', a, a, count('area', a))}`)
  .join('\n')}
  </div>
</div>
<div class="filters__group" role="group" aria-labelledby="flt-type">
  <span class="filters__label" id="flt-type">Type</span>
  <div class="chips">
${TYPES.map((t) => `    ${chip('type', t, t, count('type', t))}`).join('\n')}
  </div>
</div>
<div class="filters__group" role="group" aria-labelledby="flt-location">
  <span class="filters__label" id="flt-location">Location</span>
  <div class="chips">
${LOCATIONS.map((l) => `    ${chip('location', l, l, count('location', l))}`).join('\n')}
  </div>
</div>`;

const jobRow = (j) => `
<li class="job" id="role-${j.slug}" data-slug="${j.slug}" data-title="${esc(j.title)}" data-area="${esc(j.area)}" data-type="${esc(j.type)}" data-location="${esc(j.location)}" data-posted-at="${j.postedAt}" data-keywords="${esc([j.title, j.area, ...j.skills, ...j.lookFor].join(' ').toLowerCase())}">
  <div class="job__head">
    <div class="job__name">
      <h3 class="job__title"><a href="/careers/${j.slug}/" data-expand>${esc(j.title)}</a></h3>
      <span class="job__posted" data-posted="${j.postedAt}">Posted ${fmtDate(j.postedAt)}</span>
    </div>
    <span class="job__cell"><span class="sr-only">Area: </span>${esc(j.area)}</span>
    <span class="job__cell"><span class="sr-only">Type: </span>${esc(j.type)}</span>
    <span class="job__cell"><span class="sr-only">Location: </span>${esc(j.location)}</span>
    <button class="job__toggle" type="button" aria-expanded="false" aria-controls="role-${j.slug}-panel"><span class="sr-only">Show summary: ${esc(j.title)}</span></button>
  </div>
  <div class="job__panel" id="role-${j.slug}-panel" hidden>
    <div class="job__panel-inner">
      <div class="job__summary">
        <p class="t-label-lg">${esc(j.summary)}</p>
        <p class="eyebrow">What you'll do</p>
        <ul class="job__bullets" role="list">
${j.youllDo.map((x) => `          <li>${esc(x)}</li>`).join('\n')}
        </ul>
      </div>
      <div class="job__side">
        <p class="eyebrow">What we look for</p>
        <ul class="job__tags" role="list">
${j.lookFor.map((x) => `          <li>${esc(x)}</li>`).join('\n')}
        </ul>
        <a class="btn btn--l btn--block" href="/careers/${j.slug}/"><span>View role</span>${btnIcon}</a>
        <a class="link-arrow job__apply" href="/careers/${j.slug}/#apply">Apply now ${arrow()}</a>
      </div>
    </div>
  </div>
</li>`;

const careersList = `
<ul class="jobs" role="list" data-jobs>
${byNewest.map((j) => jobRow(j).trim()).join('\n')}
</ul>`;

// ---------------------------------------------------------------------------
// Work With Us preview (max 5 roles + team chips incl. empty teams)
// ---------------------------------------------------------------------------
const wwuRoles = `
<div class="chips wwu-roles__chips" role="radiogroup" aria-label="Filter roles by team" data-roles-filter>
  <button class="chip" type="button" role="radio" aria-checked="true" data-team="all">All · ${JOBS.length}</button>
${AREAS.map((a) => `  <button class="chip" type="button" role="radio" aria-checked="false" tabindex="-1" data-team="${esc(a)}">${esc(a)} · ${count('area', a)}</button>`).join('\n')}
</div>
<p class="sr-only" aria-live="polite" data-roles-status></p>
<ul class="wwu-roles__list" role="list" data-roles>
${byNewest
  .slice(0, 5)
  .map(
    (j) => `  <li class="role-row" data-area="${esc(j.area)}">
    <a href="/careers/${j.slug}/">
      <span class="role-row__title">${esc(j.title)}</span>
      <span class="role-row__metas"><span class="role-row__meta">${esc(j.area)}</span><span class="role-row__meta">${esc(j.location)}</span><span class="role-row__meta">${esc(j.type)}</span></span>
      <span class="role-row__go"><span class="role-row__apply">Apply</span> <span aria-hidden="true">→</span></span>
    </a>
  </li>`,
  )
  .join('\n')}
</ul>
<div class="wwu-roles__empty" data-roles-empty hidden>
  <p class="t-label-lg">No open roles in <span data-empty-team></span> right now</p>
  <p class="t-p-sm c-sub">Join the talent pool and we'll reach out when a role opens on this team.</p>
  <a class="link-arrow" href="/careers/#open-application">Join the talent pool ${arrow()}</a>
</div>`;

const wwaCareers = `
<span class="join-card__tag">${JOBS.length} open role${JOBS.length === 1 ? '' : 's'}</span>
<h3 class="t-h3">Careers</h3>
<p class="t-p-md">Open roles for strategists, specialists and creatives who want to learn an industry deeply.</p>
<a class="link-arrow link-arrow--on-dark join-card__link" href="/careers/">See open roles ${arrow()}</a>
<ul class="join-card__roles" role="list" aria-label="Some of our open roles">
${byNewest
  .slice(0, 2)
  .map((j) => `  <li><a href="/careers/${j.slug}/">${esc(j.title)} · ${esc(j.location)} <span aria-hidden="true">→</span></a></li>`)
  .join('\n')}
</ul>`;

// ---------------------------------------------------------------------------
// Job detail page (Figma "Job Detail — Desktop 1440" 5819:130 / Mobile 5819:513)
// ---------------------------------------------------------------------------
const EMPLOYMENT = { 'Full-time': 'FULL_TIME', 'Part-time': 'PART_TIME', Contract: 'CONTRACTOR' };
const options = (list, placeholder) => [`<option value="">${esc(placeholder)}</option>`, ...list.map((o) => `<option>${esc(o)}</option>`)].join('');

function jsonLd(j) {
  const description = [
    `<p>${esc(j.about)}</p>`,
    `<h3>Responsibilities</h3><ul>${j.responsibilities.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`,
    `<h3>Requirements</h3><ul>${j.requirements.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`,
    `<h3>Nice to have</h3><ul>${j.niceToHave.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`,
  ].join('');
  const data = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: j.title,
    description,
    identifier: { '@type': 'PropertyValue', name: 'Savvy Post Marketing', value: j.slug },
    datePosted: j.postedAt,
    validThrough: `${j.closesAt}T23:59:59-05:00`,
    employmentType: EMPLOYMENT[j.type] || 'OTHER',
    hiringOrganization: { '@type': 'Organization', name: 'Savvy Post Marketing', sameAs: SITE_URL, logo: `${SITE_URL}/brand/isologo-gradient.svg` },
    jobLocationType: 'TELECOMMUTE',
    ...(j.location.includes('US') ? { applicantLocationRequirements: { '@type': 'Country', name: 'United States' } } : {}),
    occupationalCategory: j.area,
    skills: j.skills.join(', '),
    directApply: true,
    url: `${SITE_URL}/careers/${j.slug}/`,
  };
  // baseSalary is added only once a real range exists (Figma uses "[$X – $Y]" placeholders)
  if (j.salary?.min && j.salary?.max)
    data.baseSalary = { '@type': 'MonetaryAmount', currency: j.salary.currency || 'USD', value: { '@type': 'QuantitativeValue', minValue: j.salary.min, maxValue: j.salary.max, unitText: j.salary.unit || 'YEAR' } };
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

const facts = (j, cls) => `<dl class="facts ${cls}">
            <div><dt>Salary</dt><dd>${esc(j.facts.salary)}</dd></div>
            <div><dt>Team</dt><dd>${esc(j.facts.team)}</dd></div>
            <div><dt>Start</dt><dd>${esc(j.facts.start)}</dd></div>
            <div><dt>Hiring time</dt><dd>${esc(j.facts.hiringTime)}</dd></div>
          </dl>`;

const field = ({ id, label, req = false, hint = '', control, cls = '' }) => `<div class="field${cls ? ` ${cls}` : ''}" data-field="${id}">
                <label class="field__label" for="f-${id}">${label}${req ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="c-muted">(optional)</span>'}</label>
                ${hint ? `<p class="field__hint" id="f-${id}-hint">${hint}</p>\n                ` : ''}${control}
                <p class="field__error" id="f-${id}-error"></p>
              </div>`;
const describedBy = (id, hint) => `aria-describedby="${hint ? `f-${id}-hint ` : ''}f-${id}-error"`;

function jobPage(j) {
  const others = byNewest.filter((o) => o.slug !== j.slug).slice(0, 3);
  const title = `${j.title} — Careers at Savvy Post`;
  return `<!doctype html>
<html lang="en">
  <head>
    <!-- @include head -->
    <!-- Generated by scripts/build-jobs.mjs from src/content/jobs.js — edit the data, then run: node scripts/build-jobs.mjs -->
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(`${j.title} · ${j.area} · ${j.type} · ${j.location}. ${j.summary}`)}" />
    <link rel="canonical" href="${SITE_URL}/careers/${j.slug}/" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(j.summary)}" />
    <meta property="og:type" content="website" />
    <script type="application/ld+json">
${jsonLd(j)}
    </script>
  </head>
  <body class="page-job">
    <!-- @include header -->

    <main id="main" data-job="${esc(JSON.stringify({ slug: j.slug, title: j.title, requiresOverlap: j.requiresOverlap, email: CAREERS_EMAIL }))}">
      <!-- 1 · Title + meta -->
      <section class="job-top co-section co-first has-fx" aria-labelledby="job-title" data-job-top>
        <div class="job-top__cover" role="img" aria-label="Generative cover for the ${esc(j.title)} role" data-cover-live="${j.slug}"></div>
        <div class="job-top__hud" aria-hidden="true"><span>Role ${String(JOBS.indexOf(j) + 1).padStart(2, '0')} / ${String(JOBS.length).padStart(2, '0')}</span><span>${esc(j.area)} · ${esc(j.type)}</span><span>Local <span data-clock>--:--:--</span></span></div>
        <div class="co-wrap job-top__wrap">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <ol>
              <li><a href="/careers/">Careers</a></li>
              <li><a href="/careers/?area=${encodeURIComponent(j.area)}" aria-current="page">${esc(j.area)}</a></li>
            </ol>
          </nav>
          <h1 class="t-h1" id="job-title" data-chars>${esc(j.title)}</h1>
          <ul class="job-top__chips" role="list" data-hero-item>
            <li>${esc(j.area)}</li>
            <li>${esc(j.type)}</li>
            <li>${esc(j.location)}</li>
          </ul>
          <p class="t-p-sm c-sub" data-hero-item><span data-posted="${j.postedAt}">Posted ${fmtDate(j.postedAt)}</span> · Closes <time datetime="${j.closesAt}">${fmtDate(j.closesAt)}</time></p>
          <div class="job-top__actions" data-hero-item>
            <a class="btn btn--l" href="#apply" data-magnetic data-apply-cta><span>Apply now</span>${btnIcon}</a>
            <button class="job-share" type="button" data-share><span aria-hidden="true">⤴</span> Share role</button>
          </div>
          ${facts(j, 'facts--mobile')}
        </div>
      </section>

      <!-- Body: content + sticky facts card -->
      <div class="job-body co-section">
        <div class="co-wrap job-body__wrap">
          <article class="job-content">
            <section class="job-sec" aria-labelledby="sec-about" data-reveal>
              <h2 class="eyebrow" id="sec-about">About the role</h2>
              <p class="t-p-lg">${esc(j.about)}</p>
            </section>
            <section class="job-sec" aria-labelledby="sec-resp" data-reveal>
              <h2 class="eyebrow" id="sec-resp">Responsibilities</h2>
              <ul class="job-list" role="list">
${j.responsibilities.map((x) => `                <li>${esc(x)}</li>`).join('\n')}
              </ul>
            </section>
            <section class="job-sec job-sec--cols" aria-label="Requirements and nice to have" data-reveal>
              <div>
                <h2 class="eyebrow">Requirements</h2>
                <ul class="job-list job-list--check" role="list">
${j.requirements.map((x) => `                  <li>${esc(x)}</li>`).join('\n')}
                </ul>
              </div>
              <div>
                <h2 class="eyebrow">Nice to have</h2>
                <ul class="job-list job-list--plus" role="list">
${j.niceToHave.map((x) => `                  <li>${esc(x)}</li>`).join('\n')}
                </ul>
              </div>
            </section>
            <section class="job-sec" aria-labelledby="sec-offer">
              <h2 class="eyebrow" id="sec-offer">What we offer</h2>
              <ul class="offer-grid" role="list" data-reveal-stagger="0.05">
${j.offer.map((o) => `                <li data-reveal><h3 class="t-label-lg">${esc(o.title)}</h3><p class="t-p-sm c-sub">${esc(o.text)}</p></li>`).join('\n')}
              </ul>
            </section>
            <section class="job-sec" aria-labelledby="sec-process">
              <h2 class="eyebrow" id="sec-process">Hiring process</h2>
              <ol class="process" role="list" data-process>
${j.process.map((p, i) => `                <li><span class="process__num" aria-hidden="true">${i + 1}</span><h3 class="t-label-lg">${esc(p.title)}</h3><p class="t-p-sm c-sub">${esc(p.text)}</p><p class="t-label-xs c-muted">${esc(p.when)}</p></li>`).join('\n')}
              </ol>
            </section>

            <!-- 7 · Apply form (anchor #apply) -->
            <section class="apply" id="apply" aria-labelledby="apply-title" tabindex="-1">
              <form class="apply__form" novalidate data-apply-form>
                <div class="apply__head">
                  <div>
                    <p class="eyebrow">Apply</p>
                    <h2 class="t-h3" id="apply-title">Apply for ${esc(j.title)}</h2>
                    <p class="t-p-md c-sub">Takes about 10 minutes. Fields marked <span aria-hidden="true">*</span><span class="sr-only">with an asterisk</span> are required.</p>
                  </div>
                  <p class="apply__draft" data-draft-status aria-live="polite"></p>
                </div>

                <div class="form-banner form-banner--info" role="status" tabindex="-1" data-banner-draft hidden>
                  <span class="form-banner__icon" aria-hidden="true">ℹ</span>
                  <div class="form-banner__body">
                    <strong data-draft-when>Welcome back. We restored your draft.</strong>
                    <span>Your CV wasn't saved, please attach it again.</span>
                    <div class="form-banner__actions"><button class="text-btn" type="button" data-draft-clear>Start over</button></div>
                  </div>
                </div>
                <div class="form-banner form-banner--error" role="alert" tabindex="-1" data-banner-errors hidden>
                  <span class="form-banner__icon" aria-hidden="true">⚠</span>
                  <div class="form-banner__body">
                    <strong data-errors-title>Some fields need your attention</strong>
                    <ul data-errors-list></ul>
                  </div>
                </div>
                <div class="form-banner form-banner--error" role="alert" tabindex="-1" data-banner-network hidden>
                  <span class="form-banner__icon" aria-hidden="true">⚠</span>
                  <div class="form-banner__body">
                    <strong>We couldn't send your application.</strong>
                    <span data-network-text>Check your connection and try again. Your answers are saved on this device.</span>
                    <div class="form-banner__actions">
                      <button class="text-btn" type="submit">Try again</button>
                      <a class="text-btn" data-mailto hidden href="#">Email it instead</a>
                    </div>
                    <small class="c-sub" data-network-ref></small>
                  </div>
                </div>

                <fieldset class="apply__group">
                  <legend class="apply__legend"><span class="apply__num" aria-hidden="true">1</span> About you</legend>
                  <div class="apply__row">
              ${field({ id: 'name', label: 'Full name', req: true, control: `<input class="input" id="f-name" name="name" type="text" autocomplete="name" placeholder="Jane Doe" maxlength="80" required ${describedBy('name')} />` })}
              ${field({ id: 'email', label: 'Email', req: true, hint: "We'll reply to this address.", control: `<input class="input" id="f-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="jane@email.com" maxlength="150" required ${describedBy('email', true)} />` })}
                  </div>
                  <div class="apply__row">
              ${field({ id: 'phone', label: 'Phone', control: `<input class="input" id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+1 (555) 000-0000" maxlength="20" ${describedBy('phone')} />` })}
              ${field({ id: 'location', label: 'Location / time zone', req: true, control: `<select class="select" id="f-location" name="location" required ${describedBy('location')}>${options(TIMEZONES, 'Choose your time zone')}</select>` })}
                  </div>
                  <div class="apply__row">
              ${field({ id: 'workAuth', label: 'Work authorization', req: true, control: `<select class="select" id="f-workAuth" name="workAuth" required ${describedBy('workAuth')}>${options(WORK_AUTH, 'Choose one')}</select>` })}
                  </div>
                </fieldset>

                <fieldset class="apply__group">
                  <legend class="apply__legend"><span class="apply__num" aria-hidden="true">2</span> Your experience</legend>
                  <div class="field" data-field="cv">
                    <span class="field__label" id="f-cv-label">CV / résumé <span class="req" aria-hidden="true">*</span></span>
                    <div class="dropzone" data-dropzone>
                      <input class="dropzone__input" id="f-cv" name="cv" type="file" accept="${CV_ACCEPT}" aria-labelledby="f-cv-label f-cv-cta" aria-describedby="f-cv-hint f-cv-error" required />
                      <img class="dropzone__icon" src="/ds/icons/careers-upload.svg" alt="" width="24" height="24" />
                      <p class="t-label-sm" id="f-cv-cta" data-drop-text>Drag your CV here or <span class="dropzone__browse">browse</span></p>
                      <p class="field__hint" id="f-cv-hint">PDF, DOC or DOCX · max 5 MB</p>
                    </div>
                    <div class="file-chip" data-file-chip hidden>
                      <span class="file-chip__icon" data-file-ext aria-hidden="true">PDF</span>
                      <span class="file-chip__meta"><span class="file-chip__name" data-file-name></span><span class="file-chip__size" data-file-size></span></span>
                      <button class="file-chip__remove" type="button" data-file-remove aria-label="Remove file"><img src="/ds/icons/close.svg" alt="" width="16" height="16" /></button>
                    </div>
                    <p class="field__error" id="f-cv-error"></p>
                  </div>
                  <div class="apply__row">
              ${field({ id: 'linkedin', label: 'LinkedIn profile', req: true, control: `<input class="input" id="f-linkedin" name="linkedin" type="url" inputmode="url" autocomplete="url" placeholder="linkedin.com/in/…" maxlength="300" required ${describedBy('linkedin')} />` })}
              ${field({ id: 'portfolio', label: 'Portfolio or website', control: `<input class="input" id="f-portfolio" name="portfolio" type="url" inputmode="url" placeholder="https://" maxlength="300" ${describedBy('portfolio')} />` })}
                  </div>
                </fieldset>

                <fieldset class="apply__group">
                  <legend class="apply__legend"><span class="apply__num" aria-hidden="true">3</span> A few questions</legend>
              ${field({ id: 'why', label: 'Why do you want to join Savvy Post?', req: true, control: `<textarea class="textarea" id="f-why" name="why" rows="4" placeholder="A few sentences are enough." required ${describedBy('why')}></textarea>\n                <p class="apply__counter" aria-live="polite"><span data-why-count>0</span> / 600</p>` })}
                  <div class="apply__row">
              ${field({ id: 'experience', label: esc(j.experienceQuestion), req: true, control: `<select class="select" id="f-experience" name="experience" required ${describedBy('experience')}>${options(EXPERIENCE, 'Choose one')}</select>` })}
${
  j.requiresOverlap
    ? `                    <fieldset class="field" data-field="overlap" aria-describedby="f-overlap-error">
                      <legend class="field__label">Can you work 4+ hours overlapping US Eastern time? <span class="req" aria-hidden="true">*</span></legend>
                      <div class="apply__radios">
                        <label class="radio"><input type="radio" name="overlap" value="Yes" required /> Yes</label>
                        <label class="radio"><input type="radio" name="overlap" value="No" /> No</label>
                      </div>
                      <p class="field__error" id="f-overlap-error"></p>
                    </fieldset>`
    : ''
}
                  </div>
                  <div class="apply__row">
              ${field({ id: 'salary', label: 'Salary expectation (USD / year)', control: `<input class="input" id="f-salary" name="salary" type="text" inputmode="numeric" placeholder="e.g. 80,000" maxlength="12" ${describedBy('salary')} />` })}
              ${field({ id: 'heardFrom', label: 'How did you hear about us?', control: `<select class="select" id="f-heardFrom" name="heardFrom" ${describedBy('heardFrom')}>${options(HEARD_FROM, 'Choose one')}</select>` })}
                  </div>
                </fieldset>

                <fieldset class="apply__group">
                  <legend class="apply__legend"><span class="apply__num" aria-hidden="true">4</span> Consent</legend>
                  <div class="field" data-field="consent">
                    <label class="check"><input type="checkbox" id="f-consent" name="consent" required aria-describedby="f-consent-error" /> <span>I agree to Savvy Post processing my data to review this application, as described in the <a href="/privacy/">Privacy Policy</a>. <span class="req" aria-hidden="true">*</span></span></label>
                    <p class="field__error" id="f-consent-error"></p>
                  </div>
                  <label class="check"><input type="checkbox" name="keepOnFile" /> <span>Keep my application on file for [6 months] for future roles.</span></label>
                </fieldset>

                <div class="hp" aria-hidden="true"><label>Leave this empty <input type="text" name="botField" tabindex="-1" autocomplete="off" /></label></div>

                <div class="apply__submit">
                  <button class="btn btn--l" type="submit" data-submit data-magnetic><span data-submit-label>Submit application</span>${btnIcon}</button>
                  <p class="t-p-sm c-sub">We reply to every application within [10 business days].</p>
                </div>
              </form>

              <div class="apply-done" data-apply-done tabindex="-1" hidden>
                <div class="apply-done__card">
                  <span class="apply-done__check" aria-hidden="true">✓</span>
                  <h2 class="t-h3" data-done-title tabindex="-1">Application sent</h2>
                  <p class="t-label-lg">Thanks, <span data-done-name></span>. We received your application for ${esc(j.title)}.</p>
                  <p class="t-p-md c-sub">We'll reply to <strong data-done-email></strong> within [10 business days]. Keep your reference handy if you need to contact us.</p>
                  <dl class="apply-done__summary">
                    <div><dt>Role</dt><dd>${esc(j.title)}</dd></div>
                    <div><dt>Submitted</dt><dd data-done-date></dd></div>
                    <div><dt>Reference</dt><dd data-done-ref></dd></div>
                    <div><dt>CV</dt><dd data-done-cv></dd></div>
                  </dl>
                </div>
                <div class="apply-done__next">
                  <p class="eyebrow">What happens next</p>
                  <ol class="process process--done" role="list">
                    <li class="is-done"><span class="process__num" aria-hidden="true">✓</span><h3 class="t-label-lg">Application</h3><p class="t-p-sm c-sub">Received today</p></li>
                    <li><span class="process__num" aria-hidden="true">2</span><h3 class="t-label-lg">We read it · next</h3><p class="t-p-sm c-sub">Within [10 business days]</p></li>
${j.process
  .slice(1, 3)
  .map((p, i) => `                    <li><span class="process__num" aria-hidden="true">${i + 3}</span><h3 class="t-label-lg">${esc(p.title)}</h3><p class="t-p-sm c-sub">${esc(p.text)}</p></li>`)
  .join('\n')}
                    <li><span class="process__num" aria-hidden="true">5</span><h3 class="t-label-lg">Team interview + offer</h3><p class="t-p-sm c-sub">${esc(j.process[3]?.when || 'Week 2–3')}</p></li>
                  </ol>
                </div>
                <div class="apply-done__wait">
                  <p class="eyebrow">While you wait</p>
                  <ul class="apply-done__links" role="list">
                    <li><a class="link-arrow" href="/work-with-us/#how-we-work">How we work at Savvy ${arrow()}</a></li>
                    <li><a class="link-arrow" href="/who-we-are/">Meet the team ${arrow()}</a></li>
                    <li><a class="link-arrow" href="/growth-system/">Our growth system ${arrow()}</a></li>
                  </ul>
                  <button class="job-share" type="button" data-share><span aria-hidden="true">⧉</span> Share this role with a friend</button>
                </div>
              </div>
            </section>
          </article>

          <aside class="job-aside" aria-label="Role facts">
            <div class="job-aside__card">
          ${facts(j, 'facts--desktop')}
              <a class="btn btn--l btn--block" href="#apply" data-apply-cta><span>Apply now</span>${btnIcon}</a>
              <button class="job-share job-share--center" type="button" data-share><span aria-hidden="true">⧉</span> Copy link</button>
            </div>
          </aside>
        </div>
      </div>

      <!-- More roles -->
      <section class="job-more co-section" aria-labelledby="more-title">
        <div class="co-wrap">
          <h2 class="t-h4" id="more-title">More open roles</h2>
          <ul class="job-more__cards" role="list">
${others.map((o) => `            <li class="more-card" data-tilt><h3 class="t-label-lg">${esc(o.title)}</h3><p class="t-p-sm c-sub">${esc(o.area)} · ${esc(o.type)}</p><a class="link-arrow" href="/careers/${o.slug}/">View role <span class="sr-only">: ${esc(o.title)}</span>${arrow()}</a></li>`).join('\n')}
          </ul>
        </div>
      </section>

      <!-- Mobile: sticky bottom bar (appears after the title scrolls away, hides at the form) -->
      <div class="job-bar" data-job-bar aria-hidden="true">
        <div class="job-bar__text">
          <p class="t-label-md">${esc(j.title)}</p>
          <button class="job-bar__copy" type="button" data-share tabindex="-1"><span aria-hidden="true">⧉</span> Copy link</button>
        </div>
        <a class="btn btn--l" href="#apply" tabindex="-1" data-apply-cta><span>Apply now</span>${btnIcon}</a>
      </div>
    </main>

    <!-- @include footer -->
    <script type="module" src="/src/pages/job/job.js"></script>
  </body>
</html>
`;
}

// ---------------------------------------------------------------------------
for (const j of JOBS) {
  if (slugify(j.slug) !== j.slug) throw new Error(`Invalid slug "${j.slug}"`);
  write(`careers/${j.slug}/index.html`, jobPage(j));
}
inject('careers/index.html', { 'careers-stats': careersStats, 'careers-filters': careersFilters, 'careers-list': careersList });
inject('work-with-us/index.html', { 'wwu-roles': wwuRoles });
inject('who-we-are/index.html', { 'wwa-careers': wwaCareers });

const slugs = new Set(JOBS.map((j) => j.slug));
for (const d of readdirSync(join(root, 'careers'), { withFileTypes: true }))
  if (d.isDirectory() && !slugs.has(d.name) && existsSync(join(root, 'careers', d.name, 'index.html')) && readFileSync(join(root, 'careers', d.name, 'index.html'), 'utf8').includes('Generated by scripts/build-jobs.mjs')) {
    stale++;
    console.warn(`stale role page (not in jobs.js): careers/${d.name}/ — delete it`);
  }

console.log(CHECK ? (changed || stale ? `${changed} file(s) out of date` : 'careers pages up to date') : `${JOBS.length} roles · ${changed} file(s) updated`);
if (CHECK && (changed || stale)) process.exit(1);
