// Compares two wirings of Lenis + ScrollTrigger:
//  ?mode=synced   -> Lenis driven by gsap.ticker + lenis.on('scroll', ScrollTrigger.update)  (official recipe)
//  ?mode=unsynced -> Lenis with its own autoRaf loop, ScrollTrigger only sees native scroll events
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createLab } from '../_shared/lab.js';

gsap.registerPlugin(ScrollTrigger);
const mode = new URLSearchParams(location.search).get('mode') || 'synced';
const lab = createLab(`01-lenis-scrolltrigger:${mode}`);

const lenis = new Lenis({ autoRaf: mode !== 'synced' });
if (mode === 'synced') {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

const box = document.querySelector('.box');
const tween = gsap.to(box, {
  rotation: 360,
  ease: 'none',
  scrollTrigger: { trigger: '.pin', pin: true, start: 'top top', end: '+=1500', scrub: true },
});
const st = tween.scrollTrigger;

// Sample right before paint. ResizeObserver callbacks run after *all* rAF
// callbacks (GSAP's ticker and Lenis' own loop) and after layout, so this is
// what the user actually sees in that frame.
const samples = [];
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;top:0;left:0;height:1px;visibility:hidden';
document.body.appendChild(probe);
let flip = false, lastY = window.scrollY;
(function toggle() { flip = !flip; probe.style.width = flip ? '1px' : '2px'; requestAnimationFrame(toggle); })();
new ResizeObserver(() => {
  const y = window.scrollY;
  const expected = gsap.utils.clamp(0, 1, (y - st.start) / (st.end - st.start));
  const inPin = y > st.start + 2 && y < st.end - 2;
  samples.push({
    moved: y !== lastY ? 1 : 0,
    progressErr: inPin ? Math.abs(tween.progress() - expected) : 0,
    pinTop: inPin ? Math.abs(document.querySelector('.pin').getBoundingClientRect().top) : 0,
  });
  lastY = y;
}).observe(probe);

const max = (k) => +Math.max(0, ...samples.map((s) => s[k])).toFixed(3);
window.__labStop = () => {
  lab.set('mode', mode);
  lab.set('samples', samples.length);
  const errFrames = samples.filter((x) => x.progressErr > 0.001).length;
  const moving = samples.filter((x) => x.moved).length;
  lab.set('framesWithScrollMovement', moving);
  lab.set('framesWhereScrubLagsScroll', errFrames);
  lab.set('maxScrubProgressError', max('progressErr'));
  // progress error x pinned distance = how many px the animation trails the scroll
  lab.set('maxScrubLagPx', Math.round(max('progressErr') * (st.end - st.start)));
  lab.set('maxPinDriftPx', max('pinTop'));
  lab.set('lenisPrefersReducedMotion', lenis.prefersReducedMotion);
  lab.set('finalScrollY', Math.round(window.scrollY));
  lab.finish();
};
window.__lenis = lenis;
