// Legal pages (Terms, Privacy): sticky TOC with scroll-spy + calm reading-progress rail, mobile dropdown, back to top.
import { initSite, gsap, ScrollTrigger } from '../../ds/site.js';
import { $, $$, trackHeaderOffset, revealHeadings, scrollSpy, tocJump, magnetic } from '../results/shared.js';
import './legal.css';

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

scrollSpy($$('.lg-toc__link'), (id) => {
  const link = $(`.lg-toc__link[href="#${id}"]`);
  if (link) current.textContent = link.textContent;
});

// Reading progress across the document (desktop rail + mobile bar). Scrubbed, no easing theatrics.
const content = $('.lg-content');
const rail = $('[data-toc-rail]');
const bar = $('[data-toc-progress]');
ScrollTrigger.create({
  trigger: content,
  start: 'top 40%',
  end: 'bottom 60%',
  onUpdate: (s) => {
    gsap.set(rail, { scaleY: s.progress });
    gsap.set(bar, { scaleX: s.progress });
  },
});
