// Apple-style frame scrubbing: preloaded frames (ImageBitmap) drawn into a
// pinned canvas by ScrollTrigger. Frames are generated procedurally here so the
// lab has no assets; in production they would be WebP/AVIF files.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createLab } from '../_shared/lab.js';

gsap.registerPlugin(ScrollTrigger);
const lab = createLab('07-image-sequence');
const FRAMES = 120, W = 960, H = 540;
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const t0 = performance.now();
const frames = await Promise.all(
  Array.from({ length: FRAMES }, (_, i) => {
    const oc = new OffscreenCanvas(W, H);
    const g = oc.getContext('2d');
    g.fillStyle = '#0b0d24'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H / 2); g.rotate((i / FRAMES) * Math.PI * 2);
    g.fillStyle = '#0396c7'; g.fillRect(-120, -120, 240, 240); g.restore();
    g.fillStyle = '#fff'; g.font = '48px system-ui'; g.fillText(String(i).padStart(3, '0'), 40, 80);
    return createImageBitmap(oc);
  }),
);
lab.set('decodeAllFramesMs', Math.round(performance.now() - t0));
lab.set('decodedMemoryMB', +((FRAMES * W * H * 4) / 1024 / 1024).toFixed(1));

const state = { frame: 0 };
let drawn = 0, drawTotal = 0, lastFrame = -1;
const render = () => {
  const f = Math.round(state.frame);
  if (f === lastFrame) return; // skip redundant draws
  lastFrame = f;
  const s = performance.now();
  ctx.drawImage(frames[f], 0, 0);
  drawTotal += performance.now() - s; drawn++;
};
gsap.to(state, {
  frame: FRAMES - 1, ease: 'none', onUpdate: render,
  scrollTrigger: { trigger: '.seq', pin: true, start: 'top top', end: '+=2000', scrub: 0.5 },
});
render();

window.__labStop = () => {
  lab.set('framesDrawn', drawn);
  lab.set('avgDrawImageMs', +(drawTotal / Math.max(drawn, 1)).toFixed(3));
  lab.set('lastFrameShown', lastFrame);
  lab.finish();
};
