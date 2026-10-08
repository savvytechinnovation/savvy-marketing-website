// Feature-detects and exercises native platform motion APIs (no libraries):
// CSS scroll-driven animations and the View Transitions API.
import { createLab } from '../_shared/lab.js';

const lab = createLab('03-native-css');
const reveal = document.getElementById('reveal');
const progress = document.querySelector('.progress');

lab.set('supports_animationTimeline_view', CSS.supports('animation-timeline: view()'));
lab.set('supports_animationTimeline_scroll', CSS.supports('animation-timeline: scroll()'));
lab.set('supports_ScrollTimeline_JS', 'ScrollTimeline' in window);
lab.set('supports_startViewTransition', typeof document.startViewTransition === 'function');
lab.set('supports_viewTransitionTypes', 'ViewTransition' in window && 'types' in (window.ViewTransition?.prototype ?? {}));

const opacityAt = async (y) => {
  window.scrollTo(0, y);
  await new Promise((r) => setTimeout(r, 120));
  return +getComputedStyle(reveal).opacity;
};
const top = reveal.getBoundingClientRect().top + window.scrollY;
lab.set('revealOpacity_beforeEntering', await opacityAt(0));
lab.set('revealOpacity_whenCentered', await opacityAt(top - innerHeight / 2));
lab.set('progressTransform_atMiddle', getComputedStyle(progress).transform);

if (document.startViewTransition) {
  const t0 = performance.now();
  const vt = document.startViewTransition(() => document.getElementById('card').classList.toggle('big'));
  await vt.finished;
  lab.set('viewTransitionFinishedMs', Math.round(performance.now() - t0));
}
lab.finish();
