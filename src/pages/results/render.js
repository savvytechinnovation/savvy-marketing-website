// HTML renderers for case cards / featured case. Pure string functions so the same markup is produced at build time
// (scripts/build-cases.mjs, Node) and in the browser (results.js re-renders the featured slot after filtering).
import { CONFIDENCE, industryOf, typeLabel, stageLabel, clientLabel } from '../../content/cases.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const caseUrl = (c) => `/results/${c.slug}/`;

const arrowUp = '<span class="btn__icon"><img src="/ds/icons/arrow-up-right.svg" alt="" width="20" height="20" /></span>';

export const confidence = (key, extra = '', cls = '') =>
  `<p class="conf conf--${key}${cls ? ` ${cls}` : ''}"><span class="conf__dot" aria-hidden="true">●</span><span>${esc(CONFIDENCE[key].label)}${extra ? ` · ${esc(extra)}` : ''}</span></p>`;

export const stageTags = (stages) =>
  `<ul class="stage-tags" role="list" aria-label="Growth System stages used">${stages.map((s) => `<li>${esc(stageLabel(s))}</li>`).join('')}</ul>`;

export const metaLine = (c) =>
  `${esc(industryOf(c.industry).label.toUpperCase())} · ${c.types.map((t) => esc(typeLabel(t))).join(' + ')} · ${esc(c.location)}`;

/** Grid card (Figma "Case card", 416×468). The heading link is stretched over the whole card. */
export function caseCard(c, { hidden = false } = {}) {
  return `<article class="case-card" data-case="${esc(c.slug)}" data-industry="${esc(c.industry)}" data-types="${esc(c.types.join(' '))}" data-stages="${esc(c.stages.join(' '))}"${hidden ? ' hidden' : ''}>
  <div class="case-card__photo ph" aria-hidden="true"></div>
  <p class="case-card__meta">${metaLine(c)}</p>
  <h3 class="case-card__title"><a href="${caseUrl(c)}">${esc(c.headline)}</a></h3>
  ${confidence(c.confidence, c.period)}
  <p class="case-card__client">${esc(clientLabel(c))}</p>
  ${stageTags(c.stages)}
  <span class="case-card__more" aria-hidden="true">Read the case →</span>
</article>`;
}

/** Featured case (Figma "Featured case", 1296×548). */
export function featuredCase(c, { label } = {}) {
  const ind = industryOf(c.industry);
  const quote = c.quote
    ? `<blockquote class="featured__quote"><p>${esc(c.quote.text)}</p></blockquote><p class="featured__who">${esc(c.quote.name)}, ${esc(c.quote.role.split(',')[0])}</p>`
    : '';
  return `<article class="featured" data-case="${esc(c.slug)}">
  <div class="featured__photo ph" aria-hidden="true"></div>
  <div class="featured__text">
    <p class="eyebrow">${esc(label || `Featured · ${ind.label}`)}</p>
    <h2 class="featured__title" id="featured-title">${esc(c.headline)}</h2>
    ${confidence(c.confidence, c.period)}
    <p class="featured__meta">${esc(clientLabel(c))} · ${c.types.map((t) => esc(typeLabel(t))).join(' + ')} · ${esc(c.location)}${c.size ? ` · ${esc(c.size)}` : ''}</p>
    ${quote}
    ${stageTags(c.stages)}
    <div class="featured__cta"><a class="btn btn--l" href="${caseUrl(c)}"><span>Read The Case</span>${arrowUp}</a></div>
  </div>
</article>`;
}
