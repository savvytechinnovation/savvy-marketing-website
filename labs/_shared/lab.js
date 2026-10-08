// Tiny harness: every lab reports results on window.__lab so the Playwright
// runner (labs/run-labs.mjs) can read them, and shows them in an on-page panel
// so the same measurements can be read on a real device (e.g. the deployed site).
export function createLab(name) {
  const results = {};
  let resolve;
  const done = new Promise((r) => (resolve = r));
  window.__lab = { name, results, done, errors: [] };
  window.addEventListener('error', (e) => window.__lab.errors.push(String(e.message)));
  const panel = createPanel(name);
  done.then((r) => panel.show(r));
  return {
    set: (k, v) => (results[k] = v),
    finish: () => resolve(results),
    nextFrame: () => new Promise((r) => requestAnimationFrame(() => r())),
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  };
}

function createPanel(name) {
  const el = document.createElement('aside');
  el.className = 'lab-panel';
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<header><a href="/labs/">← Labs</a><strong>${name}</strong><button type="button" data-toggle aria-expanded="true">–</button></header><div data-body>Midiendo…</div>`;
  const body = el.querySelector('[data-body]');
  const toggle = el.querySelector('[data-toggle]');
  toggle.addEventListener('click', () => {
    const open = el.classList.toggle('is-collapsed') === false;
    toggle.textContent = open ? '–' : '+';
    toggle.setAttribute('aria-expanded', String(open));
  });
  const mount = () => document.body.appendChild(el);
  document.body ? mount() : addEventListener('DOMContentLoaded', mount);

  // Labs that measure a user scroll expose window.__labStop: offer a button for it
  setTimeout(() => {
    if (typeof window.__labStop !== 'function' || el.dataset.done) return;
    body.innerHTML = '<p>Haz scroll por la página y después pulsa:</p>';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lab-panel__btn';
    btn.textContent = 'Medir ahora';
    btn.addEventListener('click', () => window.__labStop());
    body.appendChild(btn);
  }, 300);

  return {
    show(results) {
      el.dataset.done = '1';
      const rows = Object.entries(results)
        .map(([k, v]) => `<tr><th>${k}</th><td>${typeof v === 'object' ? JSON.stringify(v) : v}</td></tr>`)
        .join('');
      const errors = window.__lab.errors.length ? `<p class="lab-panel__err">Errores: ${window.__lab.errors.join(' · ')}</p>` : '';
      body.innerHTML = `<table>${rows}</table>${errors}<p class="lab-panel__note">Medido en este navegador y dispositivo.</p>`;
    },
  };
}

// Average frame time over n frames (ms). Headless/SwiftShader numbers are only
// useful for relative comparisons inside the same run, never as absolute FPS.
export async function measureFrames(n = 60, work = () => {}) {
  const times = [];
  let last = performance.now();
  for (let i = 0; i < n; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    work();
    const now = performance.now();
    times.push(now - last);
    last = now;
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { avgMs: +avg.toFixed(2), p95Ms: +times[Math.floor(times.length * 0.95)].toFixed(2) };
}
