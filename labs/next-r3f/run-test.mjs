// Integration test for the Next.js + R3F + Lenis + GSAP lab (production build).
// Usage: npm run build && npm test   -> writes results.json
import { spawn, execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright')); }

const URL = 'http://localhost:3100';
const server = spawn('npx', ['next', 'start', '-p', '3100'], { stdio: 'pipe', detached: true });
process.on('exit', () => { try { process.kill(-server.pid); } catch {} });
await new Promise((r) => server.stdout.on('data', (d) => /Ready|started/i.test(d.toString()) && r()));

const out = {};
// 1. Server HTML (what crawlers get without JS)
const html = await (await fetch(URL)).text();
out.ssr = {
  h1InHtml: html.includes('We grow brands.'),
  storyTextInHtml: html.includes('The knot turns as you scroll'),
  canvasInHtml: html.includes('<canvas'),
  fallbackInHtml: html.includes('scene-fallback'),
};

const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function run(name, ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...ctxOpts });
  // Count view transitions started by React during navigation
  await ctx.addInitScript(() => {
    window.__vt = 0;
    const orig = document.startViewTransition?.bind(document);
    if (orig) document.startViewTransition = (...a) => { window.__vt++; return orig(...a); };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => (m.type() === 'error' || /hydrat/i.test(m.text())) && errors.push(m.text()));
  const r = {};
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(800);
  const d = () => page.evaluate(() => ({ ...window.__diag, scrollTriggers: window.__ST.getAll().length, canvases: document.querySelectorAll('canvas').length, masks: document.querySelectorAll('.story-title [class*=mask], .story-title div').length }));
  r.afterLoad = await d();
  const before = r.afterLoad.renders;
  await page.waitForTimeout(1000);
  r.rendersWhileIdle1s = (await d()).renders - before;

  await page.mouse.move(600, 400);
  for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(16); }
  await page.waitForTimeout(1500);
  r.afterScroll = await d();
  r.rendersDuringScroll = r.afterScroll.renders - before;
  await page.screenshot({ path: `shot-${name}-scrolled.png` });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('a[href="/about"]');
  await page.waitForURL('**/about');
  await page.waitForTimeout(800);
  r.onAbout = await d();
  await page.click('a[href="/"]');
  await page.waitForURL(URL + '/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(800);
  r.backHome = await d();
  r.viewTransitionsStarted = await page.evaluate(() => window.__vt);
  r.errors = errors;
  await ctx.close();
  return r;
}

out.desktop = await run('desktop');
out.reducedMotionMobile = await run('mobile-reduced', { reducedMotion: 'reduce', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await browser.close();
writeFileSync('results.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
process.exit(0);
