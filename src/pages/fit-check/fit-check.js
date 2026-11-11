import { initSite, gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';
import { mount3D } from '../../ds/fx3d.js';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { initQuiz } from './quiz.js';
import { KEYS, load, save, postJson, failureMessage } from './store.js';
import { EMAIL_RE, SIGNS } from '../../lib/fit-check.js';
import './fit-check.css';

gsap.registerPlugin(SplitText, Flip);
initSite();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const mm = gsap.matchMedia();
const pageState = load(KEYS.page, { strong: [], not: [], req: {}, est: {} });
const persistPage = () => save(KEYS.page, pageState);

// ---------------------------------------------------------------------------
// Headings: masked line reveal (hero on load, others on scroll) — same as the Home
// ---------------------------------------------------------------------------
mm.add('(prefers-reduced-motion: no-preference)', () => {
  const run = () => {
    $$('[data-split]').forEach((el) => {
      const isHero = el.id === 'fit-hero-title';
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        aria: 'auto',
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110,
            duration: isHero ? 1.2 : 1,
            stagger: 0.08,
            ease: 'expo.out',
            delay: isHero ? 0.15 : 0,
            scrollTrigger: isHero ? undefined : { trigger: el, start: 'top 88%' },
          }),
      });
    });
    gsap.from('[data-hero-item]', { y: 20, opacity: 0, duration: 1, stagger: 0.08, ease: 'expo.out', delay: 0.3 });
    // Section choreography: tiers rise with scroll, requirement cards cascade, timeline steps draw in
    gsap.from('.tier', { yPercent: 14, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '.tiers', start: 'top 95%', end: 'top 55%', scrub: 0.6 } });
    gsap.from('.step', { clipPath: 'inset(0 100% 0 0)', stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 90%', end: 'top 50%', scrub: 0.6 } });
    gsap.from('.expect__row', { x: -24, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: '.expect', start: 'top 85%' } });
    ScrollTrigger.refresh();
  };
  document.fonts ? document.fonts.ready.then(run) : run();
});

// ---------------------------------------------------------------------------
// 3D moments: hero field (background layer), quiz orb reacting to progress/score, dark CTA ribbons
// ---------------------------------------------------------------------------
const heroBg = $('.fit-hero__fx');
mount3D(heroBg, { scene: 'field', theme: 'light', scrub: true });
let orb = null;
const orbReady = mount3D($('[data-quiz-orb]'), { scene: 'orb' }).then((api) => (orb = api));
const orbTo = (p) => {
  orbReady.then(() => {
    if (!orb) return;
    const o = { v: orb._v ?? 0 };
    gsap.to(o, { v: p, duration: reduceMotion ? 0 : 1.2, ease: 'power3.out', onUpdate: () => orb.setProgress((orb._v = o.v)) });
  });
};
mount3D($('.fit-closing__fx'), { scene: 'ribbons', theme: 'dark' });

// ---------------------------------------------------------------------------
// Micro-interactions: magnetic CTAs, card tilt (fine pointers only)
// ---------------------------------------------------------------------------
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
  $$('.fit-hero .btn, .fit-closing .btn').forEach((btn) => {
    const x = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
    const y = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.25);
      y((e.clientY - (r.top + r.height / 2)) * 0.35);
    });
    btn.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
  $$('.tier, .deliv, .qcard').forEach((card) => {
    gsap.set(card, { transformPerspective: 900 });
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 8);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
    });
    card.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
    });
  });
}

// ---------------------------------------------------------------------------
// Hero: reading progress on "What you'll know" (lines link to sections, each gets a check)
// ---------------------------------------------------------------------------
{
  const links = $$('[data-know]');
  const fill = $('[data-know-fill]');
  const status = $('[data-know-status]');
  const read = new Set();
  const render = () => {
    links.forEach((a) => a.classList.toggle('is-read', read.has(a.dataset.know)));
    fill.style.scale = `${Math.max(0.004, read.size / links.length)} 1`;
    status.textContent = `${read.size} of ${links.length} read · tap a line to jump there`;
  };
  links.forEach((a) => {
    const sec = document.getElementById(a.dataset.know);
    if (!sec) return;
    // a section counts as read once a sentinel at its end scrolls into view
    const s = document.createElement('span');
    s.id = a.dataset.know + '-end';
    s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'display:block;height:1px;width:1px;';
    sec.append(s);
    const sentinelIo = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        read.add(a.dataset.know);
        render();
        sentinelIo.disconnect();
      }
    });
    sentinelIo.observe(s);
  });
  render();
}

// ---------------------------------------------------------------------------
// Fit profile: quiz result (preferred) or section self-checks → pill, closing summary, partnership prefill
// ---------------------------------------------------------------------------
const profilePill = $('[data-profile]');
const profileText = $('[data-profile-text]');
const summary = $('[data-summary]');
const summaryText = $('[data-summary-text]');
let quizResult = null;
let quizAnswers = {};

function updateProfile() {
  const reqNotYet = Object.values(pageState.req).filter((v) => v === 'not-yet').length;
  let signs = pageState.strong.length;
  let reqs = reqNotYet;
  if (quizResult) {
    signs = quizResult.signs.length;
    reqs = Math.max(quizResult.requirements, reqNotYet);
  }
  const touched = quizResult || pageState.strong.length || pageState.not.length || Object.keys(pageState.req).length || Object.keys(quizAnswers).length;
  profilePill.hidden = !touched;
  const industry = quizAnswers.industry && quizAnswers.industry !== 'other' ? ` · ${quizAnswers.industry === 'hvac' ? 'HVAC' : quizAnswers.industry[0].toUpperCase() + quizAnswers.industry.slice(1)}` : '';
  profileText.textContent = quizResult ? `Fit profile · ${quizResult.label} · ${signs} of 6` : `Fit profile · ${signs} of 6${industry}`;
  summary.hidden = !touched;
  summaryText.dataset.signs = signs;
  summaryText.textContent = `${signs} of ${SIGNS.length} strong-fit signs · ${reqs} requirement${reqs === 1 ? '' : 's'} to sort out`;

  // Carry the profile into Explore Partnership (prefill, "so you don't answer twice")
  const profile = {
    industry: quizAnswers.industry,
    stage: quizAnswers.stage,
    investment: quizAnswers.investment,
    markets: quizAnswers.markets || pageState.est.markets,
    outcome: quizResult?.outcome,
    signs,
    requirements: reqs,
  };
  save(KEYS.profile, profile);
  const href = new URLSearchParams({ from: quizResult ? 'fit-check' : 'are-we-a-fit' });
  if (quizAnswers.industry && quizAnswers.industry !== 'other') href.set('industry', quizAnswers.industry);
  $$('[data-partnership-link]').forEach((a) => (a.href = `/explore-partnership/?${href}`));
}

// Count up the closing summary once when it scrolls into view
ScrollTrigger.create({
  trigger: '.fit-closing',
  start: 'top 80%',
  once: true,
  onEnter: () => {
    if (summary.hidden || reduceMotion) return;
    gsap.from(summary, { scale: 0.95, autoAlpha: 0, duration: 0.4, ease: 'back.out(2)' });
  },
});

// ---------------------------------------------------------------------------
// 2-minute fit check
// ---------------------------------------------------------------------------
initQuiz($('[data-quiz]'), {
  onProgress: (p) => !quizResult && orbTo(p * 0.6),
  onAnswer: (answers) => {
    quizAnswers = answers;
    quizResult = null;
    updateProfile();
  },
  onResult: (r, answers) => {
    quizAnswers = answers;
    quizResult = r;
    orbTo(r.score / 100);
    updateProfile();
  },
});
// restore answers for the profile even before a result
quizAnswers = load(KEYS.quiz, {}).answers || quizAnswers;

// ---------------------------------------------------------------------------
// Who we work best with: checkable statements + fit signal meter (+ mobile toggle)
// ---------------------------------------------------------------------------
{
  const strongBoxes = $$('input[name="strong"]');
  const notBoxes = $$('input[name="not"]');
  strongBoxes.forEach((b) => (b.checked = pageState.strong.includes(b.value)));
  notBoxes.forEach((b) => (b.checked = pageState.not.includes(b.value)));
  const sEl = $('[data-signal-strong]');
  const nEl = $('[data-signal-not]');
  const msg = $('[data-signal-msg]');
  const count = $('[data-signal-count]');
  const render = () => {
    pageState.strong = strongBoxes.filter((b) => b.checked).map((b) => b.value);
    pageState.not = notBoxes.filter((b) => b.checked).map((b) => b.value);
    const s = pageState.strong.length;
    const n = pageState.not.length;
    const total = strongBoxes.length + notBoxes.length;
    sEl.style.flexBasis = s ? `${(s / total) * 100}%` : '1px';
    nEl.style.flexBasis = n ? `${(n / total) * 100}%` : '1px';
    count.textContent = `${s} strong-fit · ${n} not-yet`;
    msg.textContent =
      !s && !n
        ? 'Check what sounds like you. Nothing is sent until you start the assessment.'
        : n === 0 && s >= 4
          ? 'Sounds like a strong fit. The 2-minute fit check above confirms it.'
          : n > s
            ? 'A few foundations may need work first. The resources below can help.'
            : 'Somewhere in between, like most businesses. A short conversation will tell.';
  };
  $('.who__cols').addEventListener('change', () => {
    render();
    persistPage();
    updateProfile();
  });
  render();

  // Mobile toggle (tabs from site.js handle aria; show the strong list first)
  const mq = matchMedia('(max-width: 900px)');
  const applyMobile = () => {
    const selected = $('.who__toggle [aria-selected="true"]');
    $('#who-strong').hidden = mq.matches && selected.id !== 'who-tab-strong';
    $('#who-not').hidden = mq.matches && selected.id !== 'who-tab-not';
  };
  mq.addEventListener('change', applyMobile);
  applyMobile();
}

// ---------------------------------------------------------------------------
// Requirements: "I have this" badge / "Not yet" flips to "How we help"
// ---------------------------------------------------------------------------
$$('.req-card').forEach((card) => {
  const key = card.dataset.req;
  const apply = (v) => {
    card.classList.toggle('is-have', v === 'have');
    card.classList.toggle('is-flipped', v === 'not-yet');
    $('.req-card__front', card).toggleAttribute('inert', v === 'not-yet');
    $('.req-card__back', card).setAttribute('aria-hidden', v === 'not-yet' ? 'false' : 'true');
  };
  const saved = pageState.req[key];
  if (saved) {
    const input = $(`input[value="${saved}"]`, card);
    if (input) input.checked = true;
  }
  apply(saved);
  card.addEventListener('change', (e) => {
    pageState.req[key] = e.target.value;
    apply(e.target.value);
    persistPage();
    updateProfile();
  });
});

// ---------------------------------------------------------------------------
// Investment estimator (two questions → highlighted tiers, aria-live result)
// ---------------------------------------------------------------------------
{
  const form = $('[data-estimator]');
  const out = $('[data-estimate]');
  const tiers = $('[data-tiers]');
  if (pageState.est.markets) form.elements.markets.value = pageState.est.markets;
  if (pageState.est.start) form.elements.start.value = pageState.est.start;
  const render = () => {
    const markets = form.elements.markets.value;
    const start = form.elements.start.value;
    pageState.est = { markets, start };
    if (!markets || !start) {
      if (markets || start) out.textContent = 'One more question to see where most businesses like yours start.';
      return;
    }
    const match = start === 'scratch' ? ['setup', 'growth'] : markets === '1' ? ['growth'] : ['growth', 'ads'];
    if (markets === '4-plus' && !match.includes('ads')) match.push('ads');
    tiers.classList.add('has-estimate');
    $$('.tier', tiers).forEach((t) => t.classList.toggle('is-match', match.includes(t.dataset.tier)));
    const mk = { 1: 'one market', '2-3': '2–3 markets', '4-plus': '4 or more markets' }[markets];
    out.textContent =
      start === 'scratch'
        ? `Starting from scratch with ${mk}: most businesses begin with Strategy & setup, then a Growth partnership.`
        : `With tracking in place and ${mk}, most businesses go straight to a Growth partnership${match.includes('ads') ? ', with an advertising budget per market' : ''}.`;
  };
  form.addEventListener('change', () => {
    render();
    persistPage();
    updateProfile();
  });
  render();
}

// ---------------------------------------------------------------------------
// How it works: selectable steps → "We do / You do / Your time"
// ---------------------------------------------------------------------------
{
  const DETAILS = [
    { we: 'Read your answers before the call', you: 'Answer a short form', time: '5 min' },
    { we: 'Diagnose where growth is leaking and tell you honestly if we fit', you: 'Join a 30-minute call', time: '30 min' },
    { we: 'Research your market and agree on what we measure', you: 'Share access to your tools and approve priorities', time: '2 × 60 min' },
    { we: 'Set up tracking, CRM workflows and the pages the plan needs', you: 'Review and approve before launch', time: 'About 1 h a week' },
    { we: 'Run campaigns, follow-up and the first revenue-level report', you: 'Answer leads fast and join the monthly review', time: '30 min a month' },
  ];
  const list = $('[data-steps]');
  const panel = $('#step-detail');
  const show = (i) => {
    const d = DETAILS[i];
    panel.hidden = false;
    panel.setAttribute('aria-labelledby', `step-${i}`);
    const cells = $$('[data-detail]', panel);
    const set = () => cells.forEach((c) => (c.textContent = d[c.dataset.detail]));
    if (reduceMotion) return set();
    gsap.timeline().to(cells, { opacity: 0, y: -6, duration: 0.12 }).add(set).to(cells, { opacity: 1, y: 0, duration: 0.3, stagger: 0.04 });
  };
  list.addEventListener('tabchange', (e) => show(Number(e.detail.tab.id.split('-')[1])));
  if (matchMedia('(hover: hover)').matches) $$('[role=tab]', list).forEach((t) => t.addEventListener('pointerenter', () => t.click()));
}

// ---------------------------------------------------------------------------
// Realistic timeline: month slider (native range, aria-valuetext)
// ---------------------------------------------------------------------------
{
  const input = $('[data-month]');
  const label = $('[data-month-label]');
  const rows = $$('.expect__row');
  const track = input.closest('.slider__track');
  const name = (m) => (m <= 1 ? 'Visibility' : m <= 3 ? 'Quality' : m <= 6 ? 'Proof' : 'Momentum');
  const render = () => {
    const m = Number(input.value);
    const text = `Month ${m} · ${name(m)}`;
    label.textContent = text;
    input.setAttribute('aria-valuetext', text);
    track.style.setProperty('--p', String((m - 1) / 11));
    rows.forEach((r) => {
      const [a, b] = r.dataset.range.split('-').map(Number);
      r.classList.toggle('is-active', m >= a && m <= b);
    });
  };
  input.addEventListener('input', render);
  render();
}

// ---------------------------------------------------------------------------
// What you receive: "Peek inside" drawer with a sample deliverable
// ---------------------------------------------------------------------------
{
  const PEEK = {
    report: { title: 'Monthly growth report', intro: 'A one-page summary you can read in five minutes, with the detail behind it.', rows: [['Leads', '[000] · +[X%]'], ['Booked jobs', '[000] · +[X%]'], ['Revenue attributed', '[$X]'], ['Cost per booked job', '[$X]'], ["What's next", '3 priorities for next month']] },
    roadmap: { title: '90-day roadmap', intro: 'Priorities for the next quarter, agreed together and reviewed monthly.', rows: [['Month 1', 'Tracking + follow-up fixes'], ['Month 2', 'Launch local campaigns'], ['Month 3', 'Optimize and plan the next quarter'], ['Owner', 'Your strategist + your office']] },
    contact: { title: 'One point of contact', intro: 'A named strategist who knows your market, crews and seasons.', rows: [['Response time', 'Within 1 business day'], ['Monthly review', '30 minutes'], ['Channel', 'Email, phone or video']] },
    review: { title: 'Quarterly strategy review', intro: 'Step back, check goals and adjust the plan before the next quarter.', rows: [['Goals vs. results', 'Revenue, jobs, markets'], ['What to keep', 'Channels that pay back'], ['What to change', 'Budget and priorities'], ['Next quarter', 'New 90-day roadmap']] },
  };
  const dialog = $('#peek');
  const body = $('[data-peek-body]', dialog);
  let opener = null;
  $$('[data-peek]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const d = PEEK[btn.dataset.peek];
      opener = btn;
      body.innerHTML = `<p class="eyebrow">Sample deliverable</p><h2 class="t-h4" id="peek-title">${d.title}</h2><p class="t-p-md c-sub">${d.intro}</p><div class="ph" style="height:180px;border-radius:16px" aria-hidden="true"></div><ul class="peek-sheet" role="list">${d.rows.map(([k, v]) => `<li><span class="c-sub">${k}</span><strong>${v}</strong></li>`).join('')}</ul><p class="t-p-sm c-muted">Sample layout. Real reports use your numbers.</p>`;
      dialog.showModal();
    }),
  );
  dialog.addEventListener('close', () => opener?.focus());
}

// ---------------------------------------------------------------------------
// Swipe carousels (mobile): pagination dots
// ---------------------------------------------------------------------------
$$('[data-carousel]').forEach((track) => {
  const dots = track.parentElement.querySelector('.dots') || track.nextElementSibling?.classList.contains('dots') && track.nextElementSibling;
  if (!dots) return;
  const items = [...track.children];
  dots.removeAttribute('aria-hidden');
  dots.setAttribute('role', 'group');
  dots.setAttribute('aria-label', 'Carousel pagination');
  dots.innerHTML = items.map((_, i) => `<button type="button" aria-label="Show item ${i + 1}" aria-current="${i === 0}"></button>`).join('');
  const btns = [...dots.children];
  btns.forEach((b, i) => b.addEventListener('click', () => track.scrollTo({ left: items[i].offsetLeft - track.offsetLeft - 20, behavior: reduceMotion ? 'auto' : 'smooth' })));
  track.addEventListener(
    'scroll',
    () => {
      const i = Math.round(track.scrollLeft / Math.max(1, items[0].offsetWidth));
      btns.forEach((b, k) => b.setAttribute('aria-current', String(k === Math.min(i, items.length - 1))));
    },
    { passive: true },
  );
});

// ---------------------------------------------------------------------------
// Not a fit yet: gap chips filter/re-order resources (Flip) + newsletter
// ---------------------------------------------------------------------------
{
  const list = $('[data-resources]');
  const chips = $$('[data-gap]');
  chips.forEach((c) => c.addEventListener('click', () => {
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
    const gaps = chips.filter((x) => x.getAttribute('aria-pressed') === 'true').map((x) => x.dataset.gap);
    const cards = $$('.res-card', list);
    const state = Flip.getState(cards);
    cards.forEach((card) => card.classList.toggle('is-match', gaps.some((g) => card.dataset.gaps.split(' ').includes(g))));
    list.classList.toggle('is-filtered', gaps.length > 0);
    cards
      .sort((a, b) => Number(b.classList.contains('is-match')) - Number(a.classList.contains('is-match')))
      .forEach((card) => list.append(card));
    if (!reduceMotion) Flip.from(state, { duration: 0.25, ease: 'power2.out' });
  }));

  const form = $('[data-subscribe]');
  const email = form.elements.email;
  const error = $('#sub-error');
  const status = $('[data-sub-status]');
  const check = () => {
    const bad = !EMAIL_RE.test(email.value.trim());
    error.textContent = bad ? 'Please enter a valid email address.' : '';
    email.setAttribute('aria-invalid', String(bad));
    return !bad;
  };
  email.addEventListener('blur', () => email.value && check());
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    if (!check()) return email.focus();
    form.classList.add('is-sending');
    const gaps = chips.filter((x) => x.getAttribute('aria-pressed') === 'true').map((x) => x.dataset.gap);
    const res = await postJson('/api/fit-check', { kind: 'newsletter', email: email.value, gaps, botField: form.elements.botField.value });
    form.classList.remove('is-sending');
    status.dataset.type = res.ok ? 'ok' : 'error';
    status.textContent = res.ok ? "You're subscribed. Look out for the next one in your inbox." : failureMessage(res);
    if (res.ok) form.reset();
  });
}

// ---------------------------------------------------------------------------
// FAQ: topic chips filter the accordion (count announced)
// ---------------------------------------------------------------------------
{
  const chips = $$('[data-topic]');
  const items = $$('.faq__list .accordion__item');
  const count = $('[data-faq-count]');
  chips.forEach((c) =>
    c.addEventListener('click', () => {
      chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      const t = c.dataset.topic;
      const state = Flip.getState(items);
      let n = 0;
      items.forEach((it) => {
        const show = t === 'all' || it.dataset.topics.split(' ').includes(t);
        it.classList.toggle('is-filtered-out', !show);
        n += show;
      });
      if (!reduceMotion) Flip.from(state, { duration: 0.25, ease: 'power2.out', onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.25 }) });
      count.textContent = `${n} question${n === 1 ? '' : 's'} shown`;
      ScrollTrigger.refresh();
    }),
  );
}

// ---------------------------------------------------------------------------
// Testimonials: "Worried about…" chips feature the quote that answers it
// ---------------------------------------------------------------------------
{
  const chips = $$('[data-concerns] .chip');
  const track = $('[data-quotes]');
  const cards = $$('.qcard', track);
  chips.forEach((c) =>
    c.addEventListener('click', () => {
      chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      const i = Number(c.dataset.quote);
      cards.forEach((q, k) => q.classList.toggle('is-featured', k === i));
      const li = cards[i].parentElement;
      if (track.scrollWidth > track.clientWidth) track.scrollTo({ left: li.offsetLeft - track.offsetLeft - 20, behavior: reduceMotion ? 'auto' : 'smooth' });
      else if (!reduceMotion) gsap.fromTo(cards[i], { y: -8 }, { y: 0, duration: 0.5, ease: 'back.out(3)' });
    }),
  );
}

updateProfile();
