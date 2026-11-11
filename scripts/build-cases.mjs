#!/usr/bin/env node
// Generates the Results pages from src/content/cases.js (no dependencies, plain Node ≥ 18):
//
//   node scripts/build-cases.mjs           → writes results/<slug>/index.html for every case
//                                             and refreshes the generated blocks inside results/index.html
//   node scripts/build-cases.mjs --check   → exits 1 if any generated file is out of date (for CI)
//
// The generated HTML is committed, so Vite (which discovers every <dir>/index.html as a page) builds it like any
// other page and the content stays crawlable without JavaScript. Re-run after editing cases.js.
// Case pages whose slug is no longer in cases.js are reported (not deleted) so nothing disappears by accident.
//
// Figma: "Study Case (Template)" 5924:1794 (desktop 6386:2294 · mobile 6396:11011 · "How we measured" popover 6387:12093).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INDUSTRIES, TYPES, STAGES, CONFIDENCE, sortedCases, industryOf, clientLabel, typeLabel } from '../src/content/cases.js';
import { esc, caseCard, featuredCase, caseUrl, confidence } from '../src/pages/results/render.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const stale = [];

function write(file, html) {
  const prev = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (prev === html) return;
  if (CHECK) return stale.push(file);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  console.log(`  wrote ${file.replace(root + '/', '')}`);
}

const SITE = 'https://savvymarketingpartners.com';
const IND_HEX = { hvac: '#38bdf8', plumbing: '#5b7cff', electrical: '#ffb020', roofing: '#ff5527', cleaning: '#2dd4bf' };
const arrowUp = '<span class="btn__icon"><img src="/ds/icons/arrow-up-right.svg" alt="" width="20" height="20" /></span>';
const pad = (n) => String(n).padStart(2, '0');

/** A metric value: Numbers become animated counters; bracketed placeholders are printed as-is. */
function value(v, m) {
  if (typeof v !== 'number') return esc(v);
  const p = esc(m.prefix || ''), s = esc(m.suffix || '');
  const d = Number.isInteger(v) ? 0 : 1;
  return `<span data-count="${v}" data-prefix="${p}" data-suffix="${s}" data-decimals="${d}">${p}${v.toLocaleString('en-US')}${s}</span>`;
}

// ---------------------------------------------------------------------------
// Charts: inline SVG (animated on scroll by case.js) + an accessible table
// ---------------------------------------------------------------------------
function monthlyChart(ch, id) {
  const W = 900, H = 240, top = 16, bottom = 28, left = 8, right = 8;
  const max = Math.max(...ch.series.flatMap((s) => s.values));
  const nice = Math.ceil(max / 10) * 10;
  const plotH = H - top - bottom;
  const slot = (W - left - right) / ch.labels.length;
  const bw = Math.min(22, slot / 4);
  const grid = [0.5, 1].map((f) => {
    const y = top + plotH - plotH * f;
    return `<line class="chart__grid" x1="${left}" x2="${W - right}" y1="${y}" y2="${y}" /><text class="chart__tick" x="${W - right}" y="${y - 4}" text-anchor="end">${Math.round(nice * f)}</text>`;
  });
  const groups = ch.labels.map((label, i) => {
    const cx = left + slot * i + slot / 2;
    const bars = ch.series.map((s, k) => {
      const v = s.values[i];
      const h = (v / nice) * plotH;
      const x = cx + (k - ch.series.length / 2) * (bw + 4) + 2;
      return `<rect class="chart__bar chart__bar--${k}" x="${x.toFixed(1)}" y="${(top + plotH - h).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="4"><title>${esc(label)} · ${esc(s.name)}: ${v}</title></rect>`;
    });
    return `<g class="chart__group" data-label="${esc(label)}">${bars.join('')}<text class="chart__label" x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(label)}</text></g>`;
  });
  return `<svg class="chart chart--monthly" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t ${id}-d" preserveAspectRatio="none" data-chart>
  <title id="${id}-t">${esc(ch.title)}</title>
  <desc id="${id}-d">${esc(ch.caption)}. ${ch.series.map((s) => `${s.name}: ${s.values.join(', ')}`).join('. ')}.${ch.illustrative ? ' Illustrative placeholder data.' : ''}</desc>
  ${grid.join('')}
  ${groups.join('')}
</svg>`;
}

function funnelChart(ch, id) {
  const W = 900, rowH = 56, labelW = 170, H = ch.labels.length * rowH + 8;
  const max = Math.max(...ch.series.flatMap((s) => s.values));
  const span = W - labelW - 70;
  const rows = ch.labels.map((label, i) => {
    const y = i * rowH + 6;
    const bars = ch.series.map((s, k) => {
      const v = s.values[i];
      const w = (v / max) * span;
      const by = y + k * 22;
      return `<rect class="chart__bar chart__bar--${k}" x="${labelW}" y="${by}" width="${w.toFixed(1)}" height="18" rx="4"><title>${esc(label)} · ${esc(s.name)}: ${v}%</title></rect><text class="chart__value" x="${(labelW + w + 8).toFixed(1)}" y="${by + 14}">${v}%</text>`;
    });
    return `<g class="chart__group"><text class="chart__label chart__label--row" x="0" y="${y + 26}">${esc(label)}</text>${bars.join('')}</g>`;
  });
  return `<svg class="chart chart--funnel" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-t ${id}-d" data-chart>
  <title id="${id}-t">${esc(ch.title)}</title>
  <desc id="${id}-d">${esc(ch.caption)}. ${ch.labels.map((l, i) => `${l}: ${ch.series.map((s) => `${s.name} ${s.values[i]}%`).join(', ')}`).join('. ')}.${ch.illustrative ? ' Illustrative placeholder data.' : ''}</desc>
  ${rows.join('')}
</svg>`;
}

function chartFigure(c) {
  const ch = c.results.chart;
  if (!ch) return '';
  const id = `chart-${c.slug}`;
  const svg = ch.kind === 'funnel' ? funnelChart(ch, id) : monthlyChart(ch, id);
  const unit = ch.kind === 'funnel' ? '%' : '';
  const table = `<table class="cs-chart__data">
          <caption class="sr-only">${esc(ch.title)}${ch.illustrative ? ' (illustrative placeholder data)' : ''}</caption>
          <thead><tr><th scope="col">${ch.kind === 'funnel' ? 'Step' : 'Month'}</th>${ch.series.map((s) => `<th scope="col">${esc(s.name)}</th>`).join('')}</tr></thead>
          <tbody>${ch.labels.map((l, i) => `<tr><th scope="row">${esc(l)}</th>${ch.series.map((s) => `<td>${s.values[i]}${unit}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>`;
  return `<figure class="cs-chart" aria-labelledby="${id}-cap">
        <h3 class="cs-chart__title" id="${id}-cap">${esc(ch.title)}</h3>
        ${ch.illustrative ? '<p class="cs-chart__note"><span class="badge">Illustrative</span> Placeholder shape until the client’s measured numbers are added.</p>' : ''}
        <div class="cs-chart__plot">${svg}</div>
        <figcaption class="cs-chart__caption">${esc(ch.caption)}</figcaption>
        <ul class="cs-chart__legend" role="list">${ch.series.map((s, k) => `<li><span class="cs-chart__swatch cs-chart__swatch--${k}" aria-hidden="true"></span>${esc(s.name)}</li>`).join('')}<li>${confidence(c.confidence)}</li></ul>
        <details class="cs-chart__table">
          <summary>View the data as a table</summary>
          ${table}
        </details>
      </figure>`;
}

// ---------------------------------------------------------------------------
// Case page
// ---------------------------------------------------------------------------
// Round 2: scroll-driven 3D before → after "theatre" (decorative; the figure + data table below stay the accessible chart)
function theatre(c) {
  const ch = c.results.chart;
  if (!ch) return '';
  const before = ch.series[0];
  const after = ch.series[ch.series.length - 1];
  const unit = ch.kind === 'funnel' ? '%' : '';
  return `<div class="cs-theatre" data-theatre data-series="${esc(JSON.stringify([before.values, after.values]))}" data-before="${esc(JSON.stringify(before.values))}" data-after="${esc(JSON.stringify(after.values))}" data-unit="${unit}" aria-hidden="true">
              <div class="cs-theatre__stage">
                <div class="cs-theatre__3d" data-theatre-3d></div>
                <div class="cs-theatre__top">
                  <p class="cs-theatre__state"><span class="cs-theatre__name is-on" data-th-before>${esc(before.name)}</span><span class="cs-theatre__track"><span data-th-bar></span></span><span class="cs-theatre__name" data-th-after>${esc(after.name)}</span></p>
                  <p class="cs-theatre__title">${esc(ch.title)}${ch.illustrative ? ' <span class="cs-theatre__badge">Illustrative</span>' : ''}</p>
                </div>
                <ol class="cs-theatre__vals" role="list">${ch.labels.map((l, i) => `<li><span>${esc(l)}</span><b data-th-v="${i}">${before.values[i]}${unit}</b></li>`).join('')}</ol>
                <p class="cs-theatre__hint">Scroll to morph ${esc(before.name.toLowerCase())} into ${esc(after.name.toLowerCase())}</p>
              </div>
            </div>`;
}

function casePage(c, prev, next, idx = 0, total = 1) {
  const ind = industryOf(c.industry);
  const client = clientLabel(c);
  const used = STAGES.filter((s) => c.stages.includes(s.id)).length;
  const sections = [
    { id: 'challenge', label: 'Challenge', title: 'The challenge' },
    { id: 'approach', label: 'Approach', title: 'Our approach, by Growth System stage' },
    { id: 'results', label: 'Results', title: 'Results in business terms' },
    { id: 'lessons', label: 'Lessons', title: 'What we learned' },
    ...(c.quote ? [{ id: 'owner', label: 'From the owner', title: 'From the owner' }] : []),
  ].map((s, i) => ({ ...s, n: pad(i + 1) }));
  const S = Object.fromEntries(sections.map((s) => [s.id, s]));
  const head = (s) => `<h2 class="cs-section__head"><span class="cs-section__num">[${s.n}]</span> <span>${esc(s.title)}</span></h2>`;
  const desc = `${c.headline} — ${ind.label} case study: ${c.title} How ${client} worked with Savvy Marketing Partners, and how every number was measured.`;
  const minimap = STAGES.map((s) => `<li class="${c.stages.includes(s.id) ? 'is-used' : 'is-unused'}"><a href="#stage-${s.id}" data-spy-sub="stage-${s.id}">${c.stages.includes(s.id) ? '●' : '○'} ${esc(s.label)}</a></li>`).join('');
  const toc = sections
    .map((s) => `<li><a class="cs-toc__link" href="#${s.id}" data-spy="${s.id}">${s.n}&nbsp;&nbsp;${esc(s.label)}</a>${s.id === 'approach' ? `<ol class="cs-toc__stages" role="list" aria-label="Growth System stages">${minimap}</ol>` : ''}</li>`)
    .join('');

  const stages = STAGES.map((s, i) => {
    const a = c.approach[s.id];
    if (!a || !c.stages.includes(s.id))
      return `<li class="stage stage--off" id="stage-${s.id}"><div class="stage__head"><span class="stage__num" aria-hidden="true">${i + 1}</span><h3 class="stage__title">${esc(s.label)}</h3><p class="stage__when">Not part of this engagement</p></div></li>`;
    return `<li class="stage" id="stage-${s.id}" data-reveal>
            <div class="stage__head"><span class="stage__num" aria-hidden="true">${i + 1}</span><h3 class="stage__title">${esc(s.label)}</h3><p class="stage__when">${esc(a.when)}</p></div>
            <p class="stage__text">${esc(a.text)}</p>
            <ul class="stage-tags" role="list" aria-label="Systems and tools">${a.tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          </li>`;
  }).join('\n          ');

  const metrics = c.results.metrics
    .map((m, i) => {
      const hid = `hwm-${i + 1}`;
      return `<div class="metric" data-reveal>
            <p class="metric__label">${esc(m.label)}</p>
            <p class="metric__values"><span class="sr-only">From </span><span class="metric__before">${value(m.before, m)}</span><span class="metric__arrow" aria-hidden="true">→</span><span class="sr-only"> to </span><span class="metric__after">${value(m.after, m)}</span></p>
            <div class="metric__conf">${confidence(m.confidence)}<button type="button" class="hwm-btn" aria-expanded="false" aria-controls="${hid}"><span aria-hidden="true">ⓘ</span> How we measured<span class="sr-only">: ${esc(m.label.toLowerCase())}</span></button></div>
            <div class="hwm" id="${hid}" role="dialog" aria-labelledby="${hid}-t" hidden>
              <div class="hwm__head"><p class="hwm__title" id="${hid}-t">How we measured: ${esc(m.label.toLowerCase())}</p><button type="button" class="hwm__close" aria-label="Close"><img src="/ds/icons/close.svg" alt="" width="16" height="16" /></button></div>
              <dl class="hwm__list">
                <div><dt>Source</dt><dd>${esc(m.method.source)}</dd></div>
                <div><dt>What counts</dt><dd>${esc(m.method.counts)}</dd></div>
                <div><dt>Period</dt><dd>${esc(m.method.period)}</dd></div>
                <div><dt>Confidence</dt><dd class="hwm__conf hwm__conf--${m.confidence}">● ${esc(CONFIDENCE[m.confidence].label)}: ${esc(CONFIDENCE[m.confidence].short.toLowerCase())}</dd></div>
              </dl>
            </div>
          </div>`;
    })
    .join('\n          ');

  const owner = c.quote
    ? `<section class="cs-section" id="owner" aria-labelledby="owner-h">
        <figure class="cs-owner" data-reveal>
          <p class="eyebrow eyebrow--on-dark" id="owner-h">[${S.owner.n}] From the owner</p>
          <blockquote class="cs-owner__quote"><p>${esc(c.quote.text)}</p></blockquote>
          <figcaption class="cs-owner__who"><span class="cs-owner__photo ph" aria-hidden="true"></span><span><strong>${esc(c.quote.name)}</strong><span>${esc(c.quote.role)}</span></span></figcaption>
        </figure>
      </section>`
    : '';

  const navCard = (x, dir) => {
    if (!x) return '';
    const label = dir === 'prev' ? '← Previous case' : 'Next case →';
    return `<a class="cs-nav__card cs-nav__card--${dir}" href="${caseUrl(x)}" rel="${dir}">
          <span class="cs-nav__dir">${label}</span>
          <span class="cs-nav__thumb ph" aria-hidden="true"></span>
          <span class="cs-nav__text"><span class="cs-nav__title">${esc(x.headline)}</span><span class="cs-nav__meta">${esc(clientLabel(x))} · ${esc(x.location)}</span></span>
        </a>`;
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <!-- @include head -->
    <!-- Generated by scripts/build-cases.mjs from src/content/cases.js — edit the data, then run: node scripts/build-cases.mjs -->
    <title>${esc(c.headline)} — ${esc(ind.label)} case study · Savvy Marketing Partners</title>
    <meta name="description" content="${esc(desc)}" />
    <meta property="og:title" content="${esc(c.headline)} — ${esc(ind.label)} case study" />
    <meta property="og:description" content="${esc(c.intro)}" />
    <script type="application/ld+json">${JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Results', item: `${SITE}/results/` },
          { '@type': 'ListItem', position: 2, name: ind.label, item: `${SITE}/results/?industry=${c.industry}` },
          { '@type': 'ListItem', position: 3, name: c.headline, item: `${SITE}${caseUrl(c)}` },
        ],
      },
      { '@context': 'https://schema.org', '@type': 'Article', headline: `${c.headline} — ${ind.label} case study`, description: c.intro, about: `${ind.label} marketing`, publisher: { '@type': 'Organization', name: 'Savvy Marketing Partners', url: SITE }, mainEntityOfPage: `${SITE}${caseUrl(c)}` },
    ]).replace(/</g, '\\u003c')}</script>
  </head>
  <body class="page-case">
    <!-- @include header -->

    <main id="main">
      <section class="cs-hero cs-hero--r2" data-tone="dark" aria-labelledby="case-title">
        <div class="cs-hero__photo" data-case-hero data-color="${esc(IND_HEX[c.industry] || '#0792c2')}" aria-hidden="true"></div>
        <div class="hud" aria-hidden="true">
          <span class="hud__grid"></span>
          <span class="hud__corner hud__corner--tl"></span><span class="hud__corner hud__corner--tr"></span><span class="hud__corner hud__corner--bl"></span><span class="hud__corner hud__corner--br"></span>
          <p class="hud__tr"><span>CASE <b>${pad(idx + 1)}</b>/${pad(total)}</span><span>${esc(ind.label.toUpperCase())}</span><span>${esc(c.stages.length)} STAGES</span></p>
          <p class="hud__br">X <b data-hud-x>+0.000</b> Y <b data-hud-y>+0.000</b> · ${esc(CONFIDENCE[c.confidence].label.toUpperCase())}</p>
        </div>
        <nav class="cs-crumbs" aria-label="Breadcrumb">
          <ol role="list">
            <li><a href="/results/">Results</a></li>
            <li><a href="/results/?industry=${esc(c.industry)}">${esc(ind.label)}</a></li>
            <li aria-current="page">${esc(client)}</li>
          </ol>
        </nav>
        <div class="cs-hero__row">
          <div class="cs-hero__text">
            <p class="cs-hero__index" aria-hidden="true"><span class="cs-hero__index-n" data-intro-scramble>Case ${pad(idx + 1)}</span><span class="cs-hero__index-line"></span><span>${esc(ind.label)} · ${c.types.map((t) => esc(typeLabel(t))).join(' + ')}</span></p>
            <h1 class="cs-hero__h1" id="case-title"><span class="cs-hero__kicker" data-split>Case Study</span> <span class="cs-hero__title" data-split>${esc(c.title)}</span></h1>
            <p class="cs-hero__intro" data-hero-item>${esc(c.intro)}</p>
            <p class="cs-hero__conf" data-hero-item><span class="conf__dot conf__dot--${c.confidence}" aria-hidden="true">●</span><span>${esc(CONFIDENCE[c.confidence].label)} · ${esc(c.range)}</span><a href="#results">ⓘ How we measured</a></p>
            <p class="sr-only">Headline result: ${esc(c.headline)}.</p>
          </div>
          <figure class="cs-hero__media" data-hero-item>
            <figcaption><strong>${esc(client)}</strong><span>${esc(c.location)}</span></figcaption>
            <dl class="cs-hero__facts">
              <div><dt>Industry</dt><dd>${esc(ind.label)}</dd></div>
              <div><dt>Period</dt><dd>${esc(c.period)}</dd></div>
              <div><dt>Stages</dt><dd>${used} of 7</dd></div>
              <div><dt>Headline</dt><dd>${esc(CONFIDENCE[c.confidence].label)}</dd></div>
            </dl>
          </figure>
        </div>
      </section>

      <div class="cs-chapter" aria-hidden="true" data-chapter>
        <span class="cs-chapter__n" data-chapter-n>${sections[0].n}</span>
        <span class="cs-chapter__meta"><span class="cs-chapter__label" data-chapter-label>${esc(sections[0].label)}</span><span class="cs-chapter__of">/ ${pad(sections.length)}</span></span>
        <span class="cs-chapter__bars">${sections.map((s) => `<span data-chapter-bar="${s.id}"><span></span></span>`).join('')}</span>
      </div>

      <div class="cs-body">
        <aside class="cs-toc" aria-label="On this page">
          <button type="button" class="cs-toc__toggle" aria-expanded="false" aria-controls="cs-toc-list">
            <span><span class="cs-toc__eyebrow">On this page</span><span class="cs-toc__current" data-toc-current>${sections[0].n} ${esc(sections[0].label)}</span></span>
            <img src="/ds/icons/chevron-down.svg" alt="" width="20" height="20" />
          </button>
          <div class="cs-toc__panel" id="cs-toc-list">
            <p class="eyebrow cs-toc__heading">On this page</p>
            <ol class="cs-toc__list" role="list">${toc}</ol>
            <div class="cs-share">
              <span>Share</span>
              <a class="cs-share__btn" href="https://www.linkedin.com/sharing/share-offsite/?url=" data-share="linkedin" target="_blank" rel="noopener" aria-label="Share on LinkedIn">in</a>
              <a class="cs-share__btn" href="https://twitter.com/intent/tweet?url=" data-share="x" target="_blank" rel="noopener" aria-label="Share on X">X</a>
              <a class="cs-share__btn" href="https://www.facebook.com/sharer/sharer.php?u=" data-share="facebook" target="_blank" rel="noopener" aria-label="Share on Facebook">f</a>
              <button type="button" class="cs-share__copy" data-copy-link>Copy link</button>
            </div>
          </div>
        </aside>

        <div class="cs-content">
          <section class="cs-section" id="challenge" aria-labelledby="challenge-h">
            <div id="challenge-h">${head(S.challenge)}</div>
            <p class="cs-challenge__quote" data-reveal>${esc(c.challenge.quote)}</p>
            <p class="cs-challenge__body" data-reveal>${esc(c.challenge.body)}</p>
          </section>

          <section class="cs-section" id="approach" aria-labelledby="approach-h">
            <div id="approach-h">${head(S.approach)}</div>
            <p class="cs-section__intro">We worked on ${used} of the 7 stages. The others were already in place or not part of this engagement.</p>
            <ol class="stages" role="list">
          ${stages}
            </ol>
          </section>

          <section class="cs-section" id="results" aria-labelledby="results-h">
            <div id="results-h">${head(S.results)}</div>
            <p class="cs-section__intro">${esc(c.results.intro)}</p>
            ${theatre(c)}
            <div class="metrics" data-reveal-stagger="0.08">
          ${metrics}
            </div>
            ${chartFigure(c)}
          </section>

          <section class="cs-section" id="lessons" aria-labelledby="lessons-h">
            <div id="lessons-h">${head(S.lessons)}</div>
            <ul class="lessons" role="list" data-reveal-stagger="0.08">
              <li data-reveal><h3>What worked</h3><p>${esc(c.lessons.worked)}</p></li>
              <li data-reveal><h3>What didn’t</h3><p>${esc(c.lessons.didnt)}</p></li>
              <li data-reveal><h3>What we changed next</h3><p>${esc(c.lessons.next)}</p></li>
            </ul>
          </section>

          ${owner}
        </div>
      </div>

      <div class="vmarq" aria-hidden="true" data-vmarq>
        <div class="vmarq__track">${[0, 1].map(() => `<div class="vmarq__set"><span class="vmarq__w">${esc(ind.label)}</span><span class="vmarq__star">✳</span><span class="vmarq__w vmarq__w--o">${esc(CONFIDENCE[c.confidence].label)}</span><span class="vmarq__star">✳</span><span class="vmarq__w">Before → After</span><span class="vmarq__star">✳</span></div>`).join('')}</div>
      </div>

      <section class="cs-closing" aria-labelledby="closing-title">
        <div class="cs-cta" data-reveal>
          <div class="cs-cta__text">
            <h2 class="cs-cta__title" id="closing-title">Could this work for your ${esc(ind.label)} business?</h2>
            <p>Tell us where you want to grow. We’ll start from what worked here, and be honest if it doesn’t fit.</p>
          </div>
          <a class="btn btn--l btn--accent cs-cta__btn" href="/explore-partnership/?industry=${esc(c.industry)}&amp;source=${esc(c.slug)}"><span>Explore a partnership</span>${arrowUp}</a>
        </div>
        <nav class="cs-nav" aria-label="More case studies">
          ${navCard(prev, 'prev')}
          ${navCard(next, 'next')}
        </nav>
        <p class="cs-all"><a class="link-arrow cs-all__link" href="/results/">See All Results <img src="/ds/icons/arrow-right.svg" alt="" width="16" height="16" /></a></p>
      </section>
    </main>

    <!-- @include footer -->
    <script type="module" src="/src/pages/case/case.js"></script>
  </body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Hub: generated blocks inside results/index.html
// ---------------------------------------------------------------------------
function hubBlocks(list) {
  const featured = list.find((c) => c.featured) || list[0];
  const count = (pred) => list.filter(pred).length;
  const industries = INDUSTRIES.filter((i) => count((c) => c.industry === i.id));
  const chip = (filter, v, label, n, on) =>
    `<button type="button" class="chip" data-filter="${filter}" data-value="${v}" aria-pressed="${on}">${esc(label)}${n === undefined ? '' : ` <span class="chip__n">${n}</span>`}</button>`;
  const sheetGroup = (name, title, items) =>
    `<fieldset class="rh-sheet__group"><legend class="eyebrow">${title}</legend><div class="rh-sheet__chips">${items.join('')}</div></fieldset>`;
  return {
    tags: list.map((c, i) => `<span class="rh-tag" data-tag="${esc(c.slug)}"><b>${pad(i + 1)}</b> ${esc(industryOf(c.industry).label)}<em>${esc(c.headline)}</em></span>`).join(''),
    counts: `<p class="rh-legend__count"><span data-count="${list.length}">${list.length}</span> case ${list.length === 1 ? 'study' : 'studies'} · <span data-count="${industries.length}">${industries.length}</span> ${industries.length === 1 ? 'industry' : 'industries'}</p>`,
    'industry-chips': [chip('industry', 'all', 'All', list.length, true), ...INDUSTRIES.map((i) => chip('industry', i.id, i.label, count((c) => c.industry === i.id), false))].join(''),
    'type-chips': [chip('type', 'all', 'All', undefined, true), ...TYPES.map((t) => chip('type', t.id, t.label, undefined, false))].join(''),
    featured: '\n' + featuredCase(featured) + '\n          ',
    grid: '\n' + list.map((c) => caseCard(c, { hidden: c === featured })).join('\n') + '\n          ',
    sheet:
      '\n' +
      [
        sheetGroup('industry', 'Industry', [chip('industry', 'all', 'All', undefined, true), ...INDUSTRIES.map((i) => chip('industry', i.id, i.label, undefined, false))]),
        sheetGroup('type', 'Business type', [chip('type', 'all', 'All', undefined, true), ...TYPES.map((t) => chip('type', t.id, t.label, undefined, false))]),
        sheetGroup('stage', 'Growth System stage', [chip('stage', 'all', 'All', undefined, true), ...STAGES.map((s) => chip('stage', s.id, s.label, undefined, false))]),
      ].join('\n') +
      '\n        ',
  };
}

function fillMarkers(html, blocks) {
  for (const [name, content] of Object.entries(blocks)) {
    const re = new RegExp(`(<!-- cases:${name}:start -->)[\\s\\S]*?(<!-- cases:${name}:end -->)`);
    if (!re.test(html)) throw new Error(`results/index.html is missing the cases:${name} markers`);
    html = html.replace(re, (_, a, b) => `${a}${content}${b}`);
  }
  return html;
}

// ---------------------------------------------------------------------------
const list = sortedCases();
const slugs = new Set();
for (const c of list) {
  if (!/^[a-z0-9-]+$/.test(c.slug)) throw new Error(`Invalid slug: ${c.slug}`);
  if (slugs.has(c.slug)) throw new Error(`Duplicate slug: ${c.slug}`);
  if (!CONFIDENCE[c.confidence]?.headline) throw new Error(`${c.slug}: a headline result must be Measured in CRM or Platform-reported`);
  if (!industryOf(c.industry)) throw new Error(`${c.slug}: unknown industry ${c.industry}`);
  slugs.add(c.slug);
}

console.log(`Building ${list.length} case pages…`);
list.forEach((c, i) => {
  const prev = list[(i - 1 + list.length) % list.length];
  const next = list[(i + 1) % list.length];
  write(join(root, 'results', c.slug, 'index.html'), casePage(c, list.length > 1 ? prev : null, list.length > 1 ? next : null, i, list.length));
});

const hubFile = join(root, 'results', 'index.html');
write(hubFile, fillMarkers(readFileSync(hubFile, 'utf8'), hubBlocks(list)));

const orphans = readdirSync(join(root, 'results'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && !slugs.has(d.name) && existsSync(join(root, 'results', d.name, 'index.html')))
  .map((d) => d.name);
if (orphans.length) console.warn(`  ! case pages not in cases.js (delete them if intended): ${orphans.join(', ')}`);

if (CHECK && stale.length) {
  console.error(`Out of date — run node scripts/build-cases.mjs:\n  ${stale.join('\n  ')}`);
  process.exit(1);
}
console.log(CHECK ? 'Case pages are up to date.' : 'Done.');

