import { initSite, gsap, reduceMotion } from '../../ds/site.js';
import { mount3D } from '../../ds/fx3d.js';
import { $, $$, initHeadings, initMagnetic } from '../industry/motion.js';
import './not-found.css';

initSite();
const mm = gsap.matchMedia();
initHeadings(mm);
initMagnetic();

// 3D: the extruded Savvy isologo turns toward the pointer (fx3d 'logo' scene)
const stage = $('[data-nf-stage]');
mount3D($('[data-nf-3d]'), { scene: 'logo', theme: 'light' });

// Playful but subtle: the big "404" drifts away from the pointer and wobbles back (elastic) on tap
const code = $('[data-nf-code]');
if (!reduceMotion) {
  const x = gsap.quickTo(code, 'x', { duration: 0.9, ease: 'power3' });
  const y = gsap.quickTo(code, 'y', { duration: 0.9, ease: 'power3' });
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    x(-((e.clientX - r.left) / r.width - 0.5) * 40);
    y(-((e.clientY - r.top) / r.height - 0.5) * 30);
  });
  stage.addEventListener('pointerleave', () => (x(0), y(0)));
  stage.addEventListener('pointerdown', () =>
    gsap.fromTo(code, { scaleX: 1.12, scaleY: 0.88 }, { scaleX: 1, scaleY: 1, duration: 1.2, ease: 'elastic.out(1.2, 0.3)' }),
  );
  gsap.from(code, { scale: 0.6, opacity: 0, duration: 1.6, ease: 'elastic.out(1, 0.45)', delay: 0.2 });
  gsap.from('.nf-list > li:not([hidden])', { y: 16, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06, delay: 0.5 });
}

// Search-like quick links: filter the route list as you type; Enter opens the first match
const input = $('#nf-q');
const items = $$('[data-nf-list] > li');
const count = $('[data-nf-count]');
const filter = () => {
  const q = input.value.trim().toLowerCase();
  let shown = 0;
  items.forEach((li) => {
    const hay = `${li.textContent} ${li.dataset.keys}`.toLowerCase();
    const show = q ? q.split(/\s+/).every((w) => hay.includes(w)) : !li.classList.contains('nf-list__more');
    li.hidden = !show;
    if (show) shown++;
  });
  count.textContent = q ? (shown ? `${shown} page${shown > 1 ? 's' : ''} found. Press Enter to open the first.` : 'Nothing matches. Try “HVAC”, “results” or “contact”.') : '';
};
input.addEventListener('input', filter);
input.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const first = items.find((li) => !li.hidden);
  if (first) location.assign($('a', first).href);
});
// Pre-fill the filter from the broken URL (e.g. /hvac-marketing → "hvac")
const guess = location.pathname.split('/').filter(Boolean).join(' ').replace(/[-_]+/g, ' ').toLowerCase();
if (guess) {
  const word = guess.split(' ').find((w) => w.length > 2 && items.some((li) => `${li.textContent} ${li.dataset.keys}`.toLowerCase().includes(w)));
  if (word) {
    input.value = word;
    filter();
  }
}
