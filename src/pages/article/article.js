// Article pages (/resources/<slug>/): reading progress, table of contents with scroll-spy
// (desktop sticky rail + mobile sticky dropdown), share buttons, newsletter, motion and 3D cover.
import { initSite, gsap, ScrollTrigger, reduceMotion, toast, scrollLock, lenis } from '../../ds/site.js';
import { mount3D } from '../../ds/fx3d.js';
import { initNewsletters } from '../resources/newsletter.js';
import { splitHeadings, tiltCards, magnetic } from '../resources/motion.js';
import './article.css';

initSite();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mobileToc = matchMedia('(max-width: 1024px)');

const prose = $('[data-prose]');
const links = $$('[data-toc-link]');
const headings = [...new Set(links.map((a) => a.dataset.tocLink))].map((id) => document.getElementById(id)).filter(Boolean);
const bar = $('[data-toc-bar]');
const toggle = $('[data-toc-toggle]');
const panel = $('[data-toc-panel]');
const scrim = $('[data-toc-scrim]');
const current = $('[data-toc-current]');
const progressBars = $$('[data-progress]');
const placeholder = Object.assign(document.createElement('div'), { hidden: true, className: 'toc-bar-placeholder' });
bar?.after(placeholder);

// ---------------------------------------------------------------------------
// Scroll offset = fixed header (+ sticky TOC bar on mobile)
// ---------------------------------------------------------------------------
const headerBottom = () => Math.max(0, $('[data-header]')?.getBoundingClientRect().bottom ?? 0);
const scrollOffset = () => (mobileToc.matches ? 80 + (bar?.offsetHeight || 0) + 16 : Math.max(headerBottom(), 100) + 24);

// ---------------------------------------------------------------------------
// Reading progress + scroll-spy
// ---------------------------------------------------------------------------
let activeId = '';
function setActive(id) {
  if (id === activeId) return;
  activeId = id;
  links.forEach((a) => (a.dataset.tocLink === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  const i = headings.findIndex((h) => h.id === id);
  if (current && i >= 0) {
    const text = `${i + 1}. ${headings[i].textContent}`;
    if (reduceMotion || !current.textContent) current.textContent = text;
    else gsap.timeline().to(current, { yPercent: -60, opacity: 0, duration: 0.15 }).set(current, { textContent: text, yPercent: 60 }).to(current, { yPercent: 0, opacity: 1, duration: 0.25, ease: 'power2.out' });
  }
}

function tick() {
  const vh = innerHeight;
  // progress: 0 when the body reaches the header, 1 when its end reaches the bottom of the viewport
  const r = prose.getBoundingClientRect();
  const offset = scrollOffset();
  const p = gsap.utils.clamp(0, 1, (offset - r.top) / Math.max(1, r.height - vh + offset));
  progressBars.forEach((b) => gsap.set(b, { scaleX: p }));
  // scroll-spy: the section whose heading last crossed ~30% of the viewport (first section at rest)
  const line = Math.max(offset + 8, vh * 0.3);
  let id = headings[0]?.id;
  for (const h of headings) if (h.getBoundingClientRect().top <= line) id = h.id;
  setActive(id);
  // mobile bar: shadow + progress line only while stuck
  if (bar) bar.classList.toggle('is-stuck', mobileToc.matches && bar.getBoundingClientRect().top <= 81 && r.bottom > 0);
}
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: tick, onRefresh: tick });
addEventListener('scroll', tick, { passive: true });
tick();

// ---------------------------------------------------------------------------
// Mobile dropdown (Figma "Mobile On this page — behavior")
// ---------------------------------------------------------------------------
function setPanel(open, { returnFocus = true } = {}) {
  if (!panel) return;
  toggle.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
  scrim.hidden = !open;
  // Locking scroll sets overflow:clip on <html>, which disables position:sticky, so while the list is
  // open the bar is pinned with position:fixed and a placeholder keeps its slot in the flow.
  // read layout first, then write everything at once so the net layout change is zero
  const barTop = Math.max(80, bar.getBoundingClientRect().top);
  const barHeight = bar.offsetHeight;
  placeholder.style.height = open ? `${barHeight}px` : '';
  placeholder.hidden = !open;
  bar.style.top = open ? `${barTop}px` : '';
  bar.classList.toggle('is-open', open);
  scrollLock(open);
  if (open) {
    const cur = $('[aria-current="true"]', panel) || $('a', panel);
    // keep the current item in view inside the list only (scrollIntoView would also move the page)
    panel.scrollTop = Math.max(0, cur.offsetTop - panel.clientHeight / 2 + cur.offsetHeight / 2);
    cur.focus({ preventScroll: true });
    if (!reduceMotion) {
      gsap.fromTo(panel, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.45, ease: 'expo.out' });
      gsap.fromTo($$('li', panel), { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.025, ease: 'power2.out' });
      gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    }
  } else if (returnFocus) toggle.focus({ preventScroll: true });
}
toggle?.addEventListener('click', () => setPanel(toggle.getAttribute('aria-expanded') !== 'true'));
scrim?.addEventListener('click', () => setPanel(false));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && panel && !panel.hidden) setPanel(false);
});
mobileToc.addEventListener('change', () => panel && !panel.hidden && setPanel(false, { returnFocus: false }));

// ---------------------------------------------------------------------------
// TOC navigation: smooth scroll with the right offset, brief highlight, focus, shareable hash
// (capture phase so the generic in-page anchor handler in site.js does not use its fixed offset)
// ---------------------------------------------------------------------------
function goTo(id, { smooth = true } = {}) {
  const target = document.getElementById(id);
  if (!target) return;
  const y = target.getBoundingClientRect().top + scrollY - scrollOffset();
  const done = () => {
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.classList.add('is-flash');
    setTimeout(() => target.classList.remove('is-flash'), 1000);
  };
  if (lenis && smooth && !reduceMotion) lenis.scrollTo(y, { duration: 0.9, onComplete: done });
  else {
    lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y);
    done();
  }
  history.replaceState(null, '', `#${id}`);
}

$$('.toc, .toc-panel').forEach((nav) =>
  nav.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest('[data-toc-link]');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      if (panel && !panel.hidden) setPanel(false, { returnFocus: false });
      goTo(a.dataset.tocLink);
    },
    true,
  ),
);

// Deep link (#section) on load
if (location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)))) {
  addEventListener('load', () => goTo(decodeURIComponent(location.hash.slice(1)), { smooth: false }), { once: true });
}

// ---------------------------------------------------------------------------
// Share
// ---------------------------------------------------------------------------
const pageUrl = () => `${location.origin}${location.pathname}`;
const title = $('#post-title')?.textContent.trim() || document.title;

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.setAttribute('readonly', '');
    Object.assign(ta.style, { position: 'fixed', opacity: '0' });
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

$$('[data-share]').forEach((share) => {
  // Point the network links at the URL actually being read (works on previews and custom domains)
  const u = encodeURIComponent(pageUrl());
  const t = encodeURIComponent(title);
  const hrefs = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
  };
  $$('[data-share-network]', share).forEach((a) => {
    a.href = hrefs[a.dataset.shareNetwork];
    a.addEventListener('click', (e) => {
      // small popup when allowed; otherwise the link opens normally in a new tab
      const w = open(a.href, 'savvy-share', 'width=640,height=640');
      if (w) {
        w.opener = null;
        e.preventDefault();
      }
    });
  });
  const btn = $('[data-share-copy]', share);
  btn.addEventListener('click', async () => {
    const ok = await copy(pageUrl());
    toast(ok ? { title: 'Link copied', message: 'The article link is on your clipboard.', type: 'success', duration: 3500 } : { title: 'Couldn’t copy the link', message: pageUrl(), type: 'error' });
    if (ok) {
      btn.classList.add('is-copied');
      setTimeout(() => btn.classList.remove('is-copied'), 1600);
    }
  });
});

// ---------------------------------------------------------------------------
// Motion + 3D
// ---------------------------------------------------------------------------
initNewsletters();
splitHeadings();
tiltCards();
magnetic();

// Lighter 3D accent in the cover slot, scrubbed by scroll
mount3D($('.post-hero__cover'), { scene: 'ribbons', theme: 'light', scrub: true });

gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
  gsap.from('.post-hero__crumbs, .post-tag, .post-hero__dek, .post-hero__meta', { y: 16, opacity: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out', delay: 0.25, clearProps: 'transform,opacity' });
  gsap.from('.post-hero__cover', { clipPath: 'inset(8% 6% 0% 6% round 28px)', opacity: 0, duration: 1.4, ease: 'expo.out', delay: 0.2, clearProps: 'clipPath,opacity' });
  gsap.from('.post-rail', { x: -20, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.post-layout', start: 'top 85%' }, clearProps: 'transform,opacity' });
  // body blocks rise in as they are reached
  ScrollTrigger.batch('.prose > :is(blockquote, aside, figure, .prose__table, .takeaways)', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.from(els, { y: 28, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity' }),
  });
  gsap.from('.takeaways li', { x: -12, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.takeaways', start: 'top 80%' }, clearProps: 'transform,opacity' });
  // quote rule draws in
  gsap.utils.toArray('.prose__quote').forEach((q) => gsap.from(q, { borderLeftColor: 'rgba(30,41,59,0)', duration: 1, scrollTrigger: { trigger: q, start: 'top 85%' } }));
});
