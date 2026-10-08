// Magnetic button implemented two ways to compare tween churn, plus
// gsap.matchMedia() respecting prefers-reduced-motion.
import { gsap } from 'gsap';
import { createLab } from '../_shared/lab.js';

const lab = createLab('08-interactions');
const btn = document.getElementById('btn');
const strength = 0.4;

function simulate(handler, n = 200) {
  const r = btn.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    handler({ clientX: r.left + (i % 50) * (r.width / 50), clientY: r.top + r.height / 2 + Math.sin(i) * 10 });
  }
}
const activeTweens = () => gsap.globalTimeline.getChildren(true, true, false).length;

// A: a new gsap.to() per pointermove (common naive pattern)
let created = 0;
simulate((e) => {
  const r = btn.getBoundingClientRect();
  gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * strength, y: (e.clientY - r.top - r.height / 2) * strength, duration: 0.4, overwrite: 'auto' });
  created++;
});
lab.set('naive_tweensCreated', created);
lab.set('naive_activeTweensAfter', activeTweens());
gsap.killTweensOf(btn); gsap.set(btn, { x: 0, y: 0 });

// B: gsap.quickTo() reuses one tween per property
const qx = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
const qy = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
const before = activeTweens();
simulate((e) => {
  const r = btn.getBoundingClientRect();
  qx((e.clientX - r.left - r.width / 2) * strength);
  qy((e.clientY - r.top - r.height / 2) * strength);
});
lab.set('quickTo_activeTweensAdded', activeTweens() - before);

// C: reduced motion via gsap.matchMedia — the intro animation only exists when allowed
const mm = gsap.matchMedia();
let introCreated = false;
mm.add({ motionOK: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
  if (ctx.conditions.motionOK) { gsap.from('body', { opacity: 0, duration: 0.6 }); introCreated = true; }
});
lab.set('prefersReducedMotion', matchMedia('(prefers-reduced-motion: reduce)').matches);
lab.set('introAnimationCreated', introCreated);
lab.set('hoverCapable', matchMedia('(hover: hover) and (pointer: fine)').matches);
lab.finish();
