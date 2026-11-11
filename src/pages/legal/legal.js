// Legal pages (Terms, Privacy): calm but detailed.
//  - contour-line shader in the title band (scene-contours.js), grid lines + document readout
//  - sticky TOC with scroll-spy, reading-progress rail, a marker that glides to the active entry, time left
//  - section index labels (§ 01 / 12 · read time), smooth highlight of the section being read
//  - mobile dropdown, back to top
import { initSite, gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';
import { $, $$, trackHeaderOffset, revealHeadings, scrollSpy, tocJump, magnetic } from '../results/shared.js';
import { mountContours } from './scene-contours.js';
import './legal.css';
import './legal-r2.css';

initSite();
trackHeaderOffset();
revealHeadings();
magnetic($$('.lg-cta .btn'), 0.15);

const toc = $('.lg-toc');
const toggle = $('.lg-toc__toggle');
const current = $('[data-toc-current]');
const setOpen = (open) => {
  toc.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
};
toggle.addEventListener('click', () => setOpen(!toc.classList.contains('is-open')));
tocJump(toc, () => setOpen(false));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && toc.classList.contains('is-open')) {
    setOpen(false);
    toggle.focus();
  }
});

// ---------------------------------------------------------------------------
// Title band: shader + grid + document readout (decorative)
// ---------------------------------------------------------------------------
const title = $('.lg-title');
const sections = $$('.lg-section');
const words = (el) => (el.textContent.trim().match(/\S+/g) || []).length;
const totalWords = sections.reduce((n, s) => n + words(s), 0);
const WPM = 200;
{
  const gl = document.createElement('div');
  gl.className = 'lg-title__gl';
  gl.setAttribute('aria-hidden', 'true');
  const grid = document.createElement('div');
  grid.className = 'lg-title__grid';
  grid.setAttribute('aria-hidden', 'true');
  title.prepend(gl, grid);
  const doc = document.createElement('div');
  doc.className = 'lg-doc';
  doc.setAttribute('aria-hidden', 'true');
  const kind = document.body.dataset.doc || (location.pathname.includes('privacy') ? 'Privacy' : 'Terms');
  doc.innerHTML = `
    <span class="lg-doc__row"><span class="lg-doc__k">Document</span><span class="lg-doc__v">${kind}</span></span>
    <span class="lg-doc__row"><span class="lg-doc__k">Sections</span><span class="lg-doc__v">${String(sections.length).padStart(2, '0')}</span></span>
    <span class="lg-doc__row"><span class="lg-doc__k">Words</span><span class="lg-doc__v">${totalWords.toLocaleString('en-US')}</span></span>
    <span class="lg-doc__row"><span class="lg-doc__k">Status</span><span class="lg-doc__v lg-doc__v--draft">Draft · legal review</span></span>`;
  $('.lg-wrap', title).append(doc);
  mountContours(gl);
}

// ---------------------------------------------------------------------------
// Section index labels: § 01 / 12 · ~40 s
// ---------------------------------------------------------------------------
sections.forEach((sec, i) => {
  const meta = document.createElement('p');
  meta.className = 'lg-sec-meta';
  meta.setAttribute('aria-hidden', 'true');
  const secs = Math.max(10, Math.round((words(sec) / WPM) * 60 / 5) * 5);
  meta.innerHTML = `<span class="lg-sec-meta__n">§ ${String(i + 1).padStart(2, '0')}</span><i></i><span>${String(i + 1).padStart(2, '0')} / ${String(sections.length).padStart(2, '0')}</span><span class="lg-sec-meta__t">~${secs} s read</span>`;
  sec.prepend(meta);
});

// ---------------------------------------------------------------------------
// TOC: scroll-spy + gliding marker + highlight of the current section
// ---------------------------------------------------------------------------
const track = $('.lg-toc__track');
const marker = document.createElement('span');
marker.className = 'lg-toc__marker';
marker.setAttribute('aria-hidden', 'true');
track.append(marker);
const left = document.createElement('p');
left.className = 'lg-toc__left';
left.setAttribute('aria-hidden', 'true');
track.after(left);

function moveMarker(link) {
  if (!link) return;
  const y = link.offsetTop;
  const h = link.offsetHeight;
  if (reduceMotion) gsap.set(marker, { y, height: h, opacity: 1 });
  else gsap.to(marker, { y, height: h, opacity: 1, duration: 0.6, ease: 'expo.out', overwrite: true });
}
scrollSpy($$('.lg-toc__link'), (id) => {
  const link = $(`.lg-toc__link[href="#${id}"]`);
  if (link) current.textContent = link.textContent;
  moveMarker(link);
  sections.forEach((s) => s.classList.toggle('is-current', s.id === id));
});
addEventListener('resize', () => moveMarker($('.lg-toc__link.is-active')));

// Reading progress across the document (desktop rail + mobile bar) and time left. Scrubbed, no easing theatrics.
const content = $('.lg-content');
const rail = $('[data-toc-rail]');
const bar = $('[data-toc-progress]');
const totalMin = totalWords / WPM;
const renderLeft = (p) => {
  const m = totalMin * (1 - p);
  left.textContent = p >= 0.995 ? 'Read to the end' : `${Math.round(p * 100)}% read · ${m < 1 ? 'under a minute' : `~${Math.ceil(m)} min`} left`;
};
renderLeft(0);
ScrollTrigger.create({
  trigger: content,
  start: 'top 40%',
  end: 'bottom 60%',
  onUpdate: (s) => {
    gsap.set(rail, { scaleY: s.progress });
    gsap.set(bar, { scaleX: s.progress });
    renderLeft(s.progress);
  },
});

// Title band: the field fades and lifts a little as the document scrolls in
if (!reduceMotion) {
  gsap.to('.lg-title__gl', { opacity: 0.25, yPercent: -12, ease: 'none', scrollTrigger: { trigger: title, start: 'top top', end: 'bottom top', scrub: true } });
  gsap.from('.lg-doc__row', { opacity: 0, x: 16, stagger: 0.08, duration: 0.9, ease: 'expo.out', delay: 0.4 });
}
