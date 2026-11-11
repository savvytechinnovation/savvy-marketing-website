import { initSite, gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';
import { autoMount3D } from '../../ds/fx3d.js';
import { Flip } from 'gsap/Flip';
import { $, $$, splitHeadings, magnetic, tilt } from '../careers/motion.js';
import './work-with-us.css';

gsap.registerPlugin(Flip);
initSite();
autoMount3D();
magnetic();
tilt('.voice', 3);

const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  splitHeadings();
  // Hero mosaic: tiles rise in, then drift at different speeds while scrolling (depth)
  const tiles = $$('.wwu-hero__ph');
  gsap.from(tiles, { y: 40, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1, delay: 0.2 });
  tiles.forEach((t, i) =>
    gsap.to(t, { yPercent: [-6, -14, -2][i], ease: 'none', scrollTrigger: { trigger: '.wwu-hero', start: 'top top', end: 'bottom top', scrub: true } }),
  );
});

/** Vertical tablists: add ArrowUp/ArrowDown/Home/End (initSite handles click + Left/Right). */
function verticalKeys(list) {
  const tabs = $$('[role="tab"]', list);
  list.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const t = tabs[(to + tabs.length) % tabs.length];
    t.click();
    t.focus();
  });
}

// ---------------------------------------------------------------------------
// 02 Values: selector with autoplay (until the first interaction) + mobile accordion
// ---------------------------------------------------------------------------
const values = $('[data-values]');
if (values) {
  const list = $('[role="tablist"]', values);
  const tabs = $$('[role="tab"]', list);
  const card = $('[data-values-card]', values);
  const dots = $$('.wwu-values__progress > span:not(.wwu-values__count)', values);
  const count = $('[data-values-count]', values);
  const cardHome = card.parentElement;
  const mobile = matchMedia('(max-width: 900px)');
  let auto = !reduceMotion;
  let timer;

  const place = () => {
    const sel = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    if (mobile.matches) sel.after(card);
    else cardHome.append(card);
  };
  list.addEventListener('tabchange', (e) => {
    const i = tabs.indexOf(e.detail.tab);
    dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
    count.textContent = `${i + 1} / ${tabs.length}`;
    place();
    const panel = document.getElementById(e.detail.tab.getAttribute('aria-controls'));
    if (!reduceMotion) gsap.fromTo(panel.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' });
    ScrollTrigger.refresh();
  });
  verticalKeys(list);
  mobile.addEventListener('change', place);
  place();

  const stop = () => {
    auto = false;
    clearInterval(timer);
  };
  list.addEventListener('pointerdown', stop);
  list.addEventListener('keydown', stop);
  if (auto)
    ScrollTrigger.create({
      trigger: values,
      start: 'top 70%',
      end: 'bottom 30%',
      onToggle: (self) => {
        clearInterval(timer);
        if (self.isActive && auto && !mobile.matches)
          timer = setInterval(() => {
            const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
            tabs[(i + 1) % tabs.length].click();
          }, 6000);
      },
    });
}

// ---------------------------------------------------------------------------
// 03 A week at Savvy: default day = today's weekday (Thursday on weekends)
// ---------------------------------------------------------------------------
const week = $('[data-week]');
if (week) {
  const list = $('[role="tablist"]', week);
  verticalKeys(list);
  list.addEventListener('tabchange', (e) => {
    const panel = document.getElementById(e.detail.tab.getAttribute('aria-controls'));
    if (!reduceMotion) gsap.from($$('li', panel), { opacity: 0, y: 10, duration: 0.45, stagger: 0.04, ease: 'power3.out' });
  });
  const today = new Date().getDay();
  const tab = $(`[data-day="${today >= 1 && today <= 5 ? today : 4}"]`, list);
  tab?.click();
}
const tools = $('.wwu-tools');
$('[data-marquee-toggle]')?.addEventListener('click', (e) => {
  const paused = tools.classList.toggle('is-paused');
  e.currentTarget.setAttribute('aria-pressed', String(paused));
  e.currentTarget.textContent = paused ? 'Play' : 'Pause';
});

// ---------------------------------------------------------------------------
// 04 Growth path: the ladder fills step by step as you scroll past it
// ---------------------------------------------------------------------------
mm.add('(prefers-reduced-motion: no-preference)', () => {
  const bars = $$('[data-path] .wwu-path__bar span');
  gsap.set(bars, { scaleX: 0 });
  gsap.to(bars, { scaleX: 1, ease: 'none', stagger: 0.5, scrollTrigger: { trigger: '[data-path]', start: 'top 80%', end: 'bottom 45%', scrub: 0.5 } });
});

// ---------------------------------------------------------------------------
// 05 Team voices: carousel arrows + video modal (← → between voices, Esc closes)
// ---------------------------------------------------------------------------
const track = $('[data-voices]');
if (track) {
  const cards = $$('.voice', track);
  const prev = $('[data-voices-prev]');
  const next = $('[data-voices-next]');
  const step = () => cards[0].getBoundingClientRect().width + 24;
  const sync = () => {
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
  track.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  sync();

  const modal = $('#voice-modal');
  let current = 0;
  let opener = null;
  const fill = (i) => {
    current = (i + cards.length) % cards.length;
    const d = JSON.parse(cards[current].dataset.voice);
    $('[data-vm-count]', modal).textContent = `Team voices · ${current + 1} of ${cards.length}`;
    $('[data-vm-name]', modal).textContent = d.name;
    $('[data-vm-role]', modal).textContent = d.role;
    $('[data-vm-quote]', modal).textContent = d.quote;
    $('[data-vm-transcript]', modal).textContent = d.transcript;
  };
  cards.forEach((card, i) =>
    card.addEventListener('click', () => {
      opener = $('.voice__play', card);
      fill(i);
      modal.showModal();
    }),
  );
  $('[data-vm-prev]', modal).addEventListener('click', () => fill(current - 1));
  $('[data-vm-next]', modal).addEventListener('click', () => fill(current + 1));
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') fill(current - 1);
    if (e.key === 'ArrowRight') fill(current + 1);
  });
  modal.addEventListener('close', () => opener?.focus());
}

// ---------------------------------------------------------------------------
// 06 Open positions: filter by team (radio chips, Flip re-layout, empty state)
// ---------------------------------------------------------------------------
const chips = $('[data-roles-filter]');
if (chips) {
  const radios = $$('[role="radio"]', chips);
  const rows = $$('[data-roles] .role-row');
  const empty = $('[data-roles-empty]');
  const status = $('[data-roles-status]');
  const select = (chip, focus) => {
    radios.forEach((r) => {
      r.setAttribute('aria-checked', String(r === chip));
      r.tabIndex = r === chip ? 0 : -1;
    });
    if (focus) chip.focus();
    const team = chip.dataset.team;
    const state = reduceMotion ? null : Flip.getState(rows);
    let n = 0;
    rows.forEach((row) => {
      const show = team === 'all' || row.dataset.area === team;
      row.hidden = !show;
      n += show;
    });
    empty.hidden = n > 0;
    $('[data-empty-team]', empty).textContent = team;
    status.textContent = team === 'all' ? `${n} open roles` : `${n} role${n === 1 ? '' : 's'} in ${team}`;
    if (state)
      Flip.from(state, {
        duration: 0.45,
        ease: 'power2.inOut',
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.2 }),
        onComplete: () => ScrollTrigger.refresh(),
      });
    if (n === 0 && !reduceMotion) gsap.from(empty, { opacity: 0, y: 12, duration: 0.4 });
  };
  radios.forEach((r, i) => {
    r.addEventListener('click', () => select(r));
    r.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      select(radios[(i + d + radios.length) % radios.length], true);
    });
  });
}
