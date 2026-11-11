// Page-local WebGL stage used by the round-2 pages (fit check, partnership, portal, legal).
// Same rules as src/ds/fx3d.js: lazy three import, DPR cap (lower on small screens), pauses off-screen and on
// hidden tabs, one still frame (re-rendered on demand) for prefers-reduced-motion, full dispose.
//
//   const stage = await createStage(el, { build: (ctx) => ({ update(t, dt) {}, resize(w, h) {} }) });
//   stage.invalidate();   // reduced motion: re-render the still frame after state changes
import { gsap, reduceMotion } from '../../ds/site.js';

export const isSmall = () => matchMedia('(max-width: 767px)').matches;

function glSupported() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Resolve once `el` gets near the viewport (so three is only fetched when needed). */
export function whenNear(el, margin = '300px') {
  return new Promise((resolve) => {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        resolve();
      },
      { rootMargin: `${margin} 0px` },
    );
    io.observe(el);
  });
}

/**
 * @param {HTMLElement} el container (canvas fills it absolutely)
 * @param {{ build: Function, fov?: number, dpr?: number, antialias?: boolean, lazy?: boolean, observe?: HTMLElement }} opts
 * @returns {Promise<null | { THREE, renderer, scene, camera, api, invalidate(): void, destroy(): void }>}
 */
export async function createStage(el, opts) {
  if (!el || !glSupported()) return null;
  if (opts.lazy !== false) await whenNear(el);
  const THREE = await import('three');
  const small = isSmall();
  const renderer = new THREE.WebGLRenderer({ antialias: opts.antialias ?? !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, opts.dpr ?? (small ? 1.5 : 2)));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'gl-stage-canvas';
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' });
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 35, 1, 0.1, 200);
  camera.position.set(0, 0, 10);
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  const ctx = { THREE, scene, camera, renderer, el, small, reduce: reduceMotion, pointer, size: { w: 1, h: 1 } };
  const api = (await opts.build(ctx)) || {};

  const render = () => renderer.render(scene, camera);
  const resize = () => {
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    ctx.size = { w, h };
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    api.resize?.(w, h);
    if (reduceMotion) {
      api.update?.(2, 0, ctx);
      render();
    }
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    pointerTarget.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  };
  if (!reduceMotion) addEventListener('pointermove', onMove, { passive: true });

  let visible = true;
  const vis = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  vis.observe(opts.observe || el);
  let last = performance.now();
  let t = 0;
  const tick = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    t += dt;
    pointer.lerp(pointerTarget, 0.06);
    api.update?.(t, dt, ctx);
    render();
  };
  if (reduceMotion) {
    api.update?.(2, 0, ctx);
    render();
  } else gsap.ticker.add(tick);

  canvas.style.opacity = '0';
  requestAnimationFrame(() => gsap.to(canvas, { opacity: 1, duration: reduceMotion ? 0 : 1.2, ease: 'power2.out' }));

  return {
    THREE,
    renderer,
    scene,
    camera,
    api,
    ctx,
    invalidate() {
      if (!reduceMotion) return;
      api.update?.(2, 0, ctx);
      render();
    },
    destroy() {
      gsap.ticker.remove(tick);
      removeEventListener('pointermove', onMove);
      ro.disconnect();
      vis.disconnect();
      scene.traverse((o) => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach((m) => m.dispose());
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}

/** Sample `count` points from the opaque pixels of an image (e.g. the isologo SVG). Returns xy in [-1, 1]. */
export async function samplePoints(src, count, { res = 220 } = {}) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = res;
  const g = c.getContext('2d', { willReadFrequently: true });
  const s = Math.min(res / img.naturalWidth, res / img.naturalHeight) * 0.96;
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  g.drawImage(img, (res - w) / 2, (res - h) / 2, w, h);
  const data = g.getImageData(0, 0, res, res).data;
  const px = [];
  for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) if (data[(y * res + x) * 4 + 3] > 140) px.push(x, y);
  const n = px.length / 2;
  const out = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const k = (Math.random() * n) | 0;
    out[i * 2] = ((px[k * 2] + Math.random()) / res) * 2 - 1;
    out[i * 2 + 1] = -(((px[k * 2 + 1] + Math.random()) / res) * 2 - 1);
  }
  return out;
}

/** Shared GLSL: soft round sprite fragment. */
export const SPRITE_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * (0.6 + core * 0.9), vAlpha * core);
  }
`;
