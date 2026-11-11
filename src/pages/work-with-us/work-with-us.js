import { initSite, gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';
import { autoMount3D } from '../../ds/fx3d.js';
import { Flip } from 'gsap/Flip';
import { $, $$, splitHeadings, magnetic, tilt } from '../careers/motion.js';
import { stage, particles, paintCovers } from '../resources/gl-kit.js';
import { chars3D, liveClock, toneJourney, tiltGlare } from '../resources/fx-dom.js';
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

// ===========================================================================
// Round 2 — colour journey, particle hero, 3D week calendar, orbiting tools
// ===========================================================================
toneJourney('[data-tone]');
chars3D($('[data-chars]'), { delay: 0.3 });
liveClock();
paintCovers();
tiltGlare('.wwu-hero__ph', { max: 10 });

stage(
  $('[data-particles]'),
  particles(['scatter', 'logo', 'ring'], {
    count: 7000,
    offsetX: 3.4,
    mobileScale: 0.6,
    mobileY: 1.6,
    onUpdate: (t, c, { camera }) => {
      camera.position.z = 11 + c.progress * 4;
    },
  }),
  {
    eager: true,
    scrub: true,
    trigger: '.wwu-hero',
    start: 'top top',
    end: 'bottom top',
    stillTime: 3,
    onReady: (api) => {
      api.set('shape', reduceMotion ? 1 : 0);
      if (reduceMotion) return api.redraw();
      setTimeout(() => api.set('shape', 1), 400);
      ScrollTrigger.create({ trigger: '.wwu-hero', start: 'top -15%', onToggle: (st) => api.set('shape', st.isActive ? 2 : 1) });
    },
  },
);

// week: the schedule card turns like a page of a desk calendar on every day change
const weekList = $('[data-week] [role="tablist"]');
const weekCard = $('.wwu-week__card');
weekList?.addEventListener('tabchange', () => {
  if (reduceMotion) return;
  gsap.fromTo(weekCard, { rotationX: 70, y: -30, opacity: 0.2, transformOrigin: '50% 0%', transformPerspective: 1400 }, { rotationX: 0, y: 0, opacity: 1, duration: 0.8, ease: 'expo.out' });
});

// tools: billboarded tiles on a slowly rotating sphere (projected in JS so text always faces the viewer)
const orbit = $('[data-orbit]');
const toolsWrap = $('.wwu-tools');
if (orbit) {
  const names = $$('.wwu-tools__list li').map((li) => li.textContent.trim());
  const items = [...names, ...names];
  const tiles = items.map((n, i) => {
    const el = document.createElement('span');
    el.className = `wwu-orbit__tile${i % 5 === 0 ? ' is-accent' : ''}`;
    el.textContent = n;
    orbit.append(el);
    const y = 1 - (i / (items.length - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    return { el, p: [Math.cos(th) * r, y, Math.sin(th) * r] };
  });
  const rot = { x: -0.25, y: 0, vx: 0, vy: 0.0035 };
  let drag = null;
  const draw = () => {
    const R = Math.min(orbit.clientWidth * 0.4, 220);
    const cx = Math.cos(rot.x);
    const sx = Math.sin(rot.x);
    const cy = Math.cos(rot.y);
    const sy = Math.sin(rot.y);
    for (const t of tiles) {
      const [x0, y0, z0] = t.p;
      const x1 = x0 * cy + z0 * sy;
      const z1 = -x0 * sy + z0 * cy;
      const y2 = y0 * cx - z1 * sx;
      const z2 = y0 * sx + z1 * cx;
      const s = 0.62 + (z2 + 1) * 0.28;
      t.el.style.transform = `translate(-50%, -50%) translate3d(${(x1 * R * 1.35).toFixed(1)}px, ${(y2 * R * 0.85).toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
      t.el.style.opacity = (0.25 + (z2 + 1) * 0.375).toFixed(2);
      t.el.style.zIndex = String(Math.round((z2 + 1) * 50));
    }
  };
  draw();
  if (!reduceMotion) {
    gsap.ticker.add(() => {
      if (!ScrollTrigger.isInViewport(orbit)) return;
      if (!drag && !toolsWrap.classList.contains('is-paused')) {
        rot.vy += (0.0035 - rot.vy) * 0.02;
        rot.vx *= 0.95;
      }
      if (!drag) {
        rot.y += rot.vy;
        rot.x = gsap.utils.clamp(-0.9, 0.9, rot.x + rot.vx);
      }
      if (toolsWrap.classList.contains('is-paused') && !drag) rot.vy *= 0.9;
      draw();
    });
    orbit.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY };
      orbit.setPointerCapture(e.pointerId);
    });
    orbit.addEventListener('pointermove', (e) => {
      if (!drag) return;
      rot.vy = (e.clientX - drag.x) * 0.004;
      rot.vx = (e.clientY - drag.y) * 0.002;
      rot.y += rot.vy;
      rot.x = gsap.utils.clamp(-0.9, 0.9, rot.x + rot.vx);
      drag = { x: e.clientX, y: e.clientY };
    });
    const end = () => (drag = null);
    orbit.addEventListener('pointerup', end);
    orbit.addEventListener('pointercancel', end);
  }
}

mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap.from('.wwu-hero__hud', { opacity: 0, y: -10, duration: 1, delay: 0.6 });
  gsap.from('.day', { opacity: 0, clipPath: 'inset(0% 100% 0% 0% round 12px)', stagger: 0.07, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.wwu-week__row', start: 'top 80%' }, clearProps: 'clipPath,opacity' });
  gsap.from(orbit, { opacity: 0, scale: 0.6, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.wwu-tools', start: 'top 85%' } });
});
