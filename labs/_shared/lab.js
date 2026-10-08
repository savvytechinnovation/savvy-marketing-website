// Tiny harness: every lab reports results on window.__lab so the Playwright
// runner (labs/run-labs.mjs) can read them. Labs are dev-only (npm run dev).
export function createLab(name) {
  const results = {};
  let resolve;
  const done = new Promise((r) => (resolve = r));
  window.__lab = { name, results, done, errors: [] };
  window.addEventListener('error', (e) => window.__lab.errors.push(String(e.message)));
  return {
    set: (k, v) => (results[k] = v),
    finish: () => resolve(results),
    nextFrame: () => new Promise((r) => requestAnimationFrame(() => r())),
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
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
