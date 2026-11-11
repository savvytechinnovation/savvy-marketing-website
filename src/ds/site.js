// Shared behaviour for every page built on the Savvy design system.
// Import once per page:  import { initSite, toast, gsap, ScrollTrigger } from '/src/ds/site.js';
import './index.css';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export let lenis = null;

export function initSite({ smooth = true } = {}) {
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
  markCurrentNav();
  initSmoothScroll(smooth);
  initHeader();
  initMobileNav();
  initReveals();
  initCounters();
  initAccordions();
  initTabs();
  initModals();
  addEventListener('load', () => ScrollTrigger.refresh());
}

// ---------------------------------------------------------------------------
// Smooth scroll: Lenis driven by GSAP's ticker (no scrub lag — see labs/01)
// ---------------------------------------------------------------------------
function initSmoothScroll(enabled) {
  if (!enabled) return;
  lenis = new Lenis({ duration: 1.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  $$('a[href^="#"]:not([href="#"])').forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = $(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -140, duration: reduceMotion ? 0 : 1.2 });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }),
  );
}

export const scrollLock = (on) => (on ? lenis?.stop() : lenis?.start());

// ---------------------------------------------------------------------------
// Header: compact on scroll + mega menus (hover with intent delay, click, keyboard)
// ---------------------------------------------------------------------------
function initHeader() {
  const header = $('[data-header]');
  if (!header) return;
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    header.classList.toggle('is-compact', y > 120 && y > lastY);
    if (y < lastY - 4) header.classList.remove('is-compact');
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const triggers = $$('[data-mega]', header);
  const close = (except) =>
    triggers.forEach((t) => {
      if (t === except) return;
      t.setAttribute('aria-expanded', 'false');
      document.getElementById(t.getAttribute('aria-controls'))?.classList.remove('is-open');
    });
  const open = (t) => {
    close(t);
    t.setAttribute('aria-expanded', 'true');
    document.getElementById(t.getAttribute('aria-controls'))?.classList.add('is-open');
  };

  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  for (const t of triggers) {
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    const li = t.closest('li');
    let timer;
    t.addEventListener('click', () => (t.getAttribute('aria-expanded') === 'true' ? close() : open(t)));
    if (finePointer) {
      li.addEventListener('pointerenter', () => {
        clearTimeout(timer);
        timer = setTimeout(() => open(t), 90);
      });
      li.addEventListener('pointerleave', () => {
        clearTimeout(timer);
        timer = setTimeout(() => close(), 180);
      });
    }
    panel?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        close();
        t.focus();
      }
    });
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        open(t);
        panel?.querySelector('a')?.focus();
      }
    });
  }
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  document.addEventListener('click', (e) => !e.target.closest('.main-nav') && close());
  header.addEventListener('focusout', (e) => !header.contains(e.relatedTarget) && close());
}

// ---------------------------------------------------------------------------
// Mobile navigation with sub-panels (Industries / About) + focus management
// ---------------------------------------------------------------------------
function initMobileNav() {
  const toggle = $('.menu-toggle');
  const nav = $('#mobile-nav');
  if (!toggle || !nav) return;
  const panels = $$('[data-panel]', nav);

  const showPanel = (name) => {
    panels.forEach((p) => (p.hidden = p.dataset.panel !== name));
    const panel = panels.find((p) => p.dataset.panel === name);
    panel?.querySelector('a, button')?.focus();
    if (!reduceMotion) gsap.fromTo(panel.children, { x: 16, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.04, duration: 0.45, ease: 'expo.out' });
  };
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    scrollLock(open);
    if (open) showPanel('main');
    else toggle.focus();
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-panel]');
    if (btn) showPanel(btn.dataset.openPanel);
    else if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !nav.hidden) setOpen(false);
  });
  matchMedia('(min-width: 1181px)').addEventListener('change', (e) => e.matches && !nav.hidden && setOpen(false));
}

function markCurrentNav() {
  const path = location.pathname.replace(/index\.html$/, '');
  $$('.main-nav a.nav-link, .footer-col a, .mobile-nav__link[href]').forEach((a) => {
    if (a.getAttribute('href') === path) a.setAttribute('aria-current', 'page');
  });
}

// ---------------------------------------------------------------------------
// Reveal on scroll ([data-reveal], optional data-reveal-stagger on a parent)
// ---------------------------------------------------------------------------
function initReveals() {
  const els = $$('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  $$('[data-reveal-stagger]').forEach((parent) => {
    const step = Number(parent.dataset.revealStagger) || 0.08;
    $$(':scope > [data-reveal]', parent).forEach((el, i) => el.style.setProperty('--reveal-delay', `${i * step}s`));
  });
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  els.forEach((el) => io.observe(el));
}

// ---------------------------------------------------------------------------
// Counters: <span data-count="212" data-prefix="+" data-suffix="%">
// ---------------------------------------------------------------------------
function initCounters() {
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const fmt = (v) => `${el.dataset.prefix || ''}${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${el.dataset.suffix || ''}`;
    if (reduceMotion) return void (el.textContent = fmt(end));
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end,
      duration: 1.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = fmt(obj.v)),
    });
  });
}

// ---------------------------------------------------------------------------
// Accordion: .accordion__trigger[aria-expanded] + .accordion__panel
// ---------------------------------------------------------------------------
function initAccordions() {
  $$('.accordion').forEach((acc) => {
    const single = acc.hasAttribute('data-single');
    $$('.accordion__trigger', acc).forEach((btn) =>
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        if (single) $$('.accordion__trigger', acc).forEach((b) => b.setAttribute('aria-expanded', 'false'));
        btn.setAttribute('aria-expanded', String(open));
        setTimeout(() => ScrollTrigger.refresh(), 420);
      }),
    );
  });
}

// ---------------------------------------------------------------------------
// Tabs (WAI-ARIA): [role=tablist] > [role=tab][aria-controls]
// ---------------------------------------------------------------------------
function initTabs() {
  $$('[role="tablist"]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      list.dispatchEvent(new CustomEvent('tabchange', { detail: { tab } }));
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (d) select(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Modals: <button data-modal-open="id">, <dialog class="modal" id="id">
// ---------------------------------------------------------------------------
function initModals() {
  $$('[data-modal-open]').forEach((btn) =>
    btn.addEventListener('click', () => document.getElementById(btn.dataset.modalOpen)?.showModal()),
  );
  $$('dialog.modal').forEach((d) => {
    d.addEventListener('click', (e) => e.target === d && d.close());
    $$('[data-modal-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
    d.addEventListener('close', () => scrollLock(false));
    new MutationObserver(() => d.open && scrollLock(true)).observe(d, { attributes: true, attributeFilter: ['open'] });
  });
}

// ---------------------------------------------------------------------------
// Toast API: toast({ title, message, type: 'success' | 'error' | 'info', duration })
// ---------------------------------------------------------------------------
export function toast({ title = '', message = '', type = 'info', duration = 5000 } = {}) {
  let region = $('.toast-region');
  if (!region) {
    region = Object.assign(document.createElement('div'), { className: 'toast-region' });
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = '<span class="toast__bar" aria-hidden="true"></span><div></div>';
  const body = el.lastElementChild;
  if (title) body.append(Object.assign(document.createElement('strong'), { textContent: title }));
  if (message) body.append(Object.assign(document.createElement('span'), { textContent: message }));
  region.append(el);
  const remove = () => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  };
  setTimeout(remove, duration);
  el.addEventListener('click', remove);
  return remove;
}
