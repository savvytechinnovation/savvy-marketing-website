// Runs every lab in headless Chromium and writes labs/results/results.json.
// Usage: node labs/run-labs.mjs   (needs Playwright; falls back to a global install)
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright')); }

const PORT = 5199;
const BASE = `http://localhost:${PORT}/labs`;
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: join(here, '..'), stdio: 'pipe', detached: true });
const stopServer = () => { try { process.kill(-server.pid); } catch {} };
process.on('exit', stopServer);
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => d.toString().includes('Local') && resolve());
  server.on('exit', reject);
});

const wheelThrough = async (page, steps = 40) => {
  await page.mouse.move(400, 300);
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(16); }
  await page.waitForTimeout(1800);
};

const scenarios = [
  { id: '01-synced', path: '01-lenis-scrolltrigger/?mode=synced', act: wheelThrough, stop: true },
  { id: '01-unsynced', path: '01-lenis-scrolltrigger/?mode=unsynced', act: wheelThrough, stop: true },
  { id: '01-reduced-motion', path: '01-lenis-scrolltrigger/?mode=synced', ctx: { reducedMotion: 'reduce' }, act: wheelThrough, stop: true },
  { id: '02-splittext', path: '02-splittext/' },
  { id: '03-native-css', path: '03-native-css/' },
  { id: '04-flip', path: '04-flip/' },
  { id: '05-webgl-dom-images', path: '05-webgl-dom-images/' },
  { id: '05-webgl-dom-images-mobile', path: '05-webgl-dom-images/', ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
  { id: '06-three-perf', path: '06-three-perf/' },
  { id: '07-image-sequence', path: '07-image-sequence/', act: (p) => wheelThrough(p, 50), stop: true },
  { id: '08-interactions', path: '08-interactions/' },
  { id: '08-interactions-reduced-mobile', path: '08-interactions/', ctx: { reducedMotion: 'reduce', isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } } },
];

const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = { ranAt: new Date().toISOString(), browser: `chromium ${browser.version()} (headless, SwiftShader software GL)`, results: {} };
mkdirSync(join(here, 'results'), { recursive: true });

for (const s of scenarios) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...s.ctx });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  try {
    await page.goto(`${BASE}/${s.path}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__lab, null, { timeout: 15000 });
    if (s.act) { await page.waitForTimeout(500); await s.act(page); }
    if (s.stop) await page.evaluate(() => window.__labStop());
    const results = await Promise.race([
      page.evaluate(() => window.__lab.done),
      new Promise((_, rej) => setTimeout(() => rej(new Error('lab timed out (20s)')), 20000)),
    ]);
    out.results[s.id] = { ok: true, results, consoleErrors };
  } catch (e) {
    out.results[s.id] = { ok: false, error: String(e.message).split('\n')[0], consoleErrors };
  }
  await page.screenshot({ path: join(here, 'results', `${s.id}.png`) }).catch(() => {});
  await context.close();
  console.log(s.id, out.results[s.id].ok ? 'ok' : `FAIL: ${out.results[s.id].error}`);
}

await browser.close();
stopServer();
writeFileSync(join(here, 'results', 'results.json'), JSON.stringify(out, null, 2));
console.log('wrote labs/results/results.json');
