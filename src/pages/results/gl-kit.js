// Round-2 WebGL kit shared by the Industries + Results scenes (page-local, not DS).
//
//   const api = await glStage(el, async (ctx) => ({ update(t, dt, ctx), resize(w, h), pick(ndc), dispose() }), opts)
//
// Rules (same as src/ds/fx3d.js): three is imported lazily when the box nears the viewport, the loop pauses
// off-screen and in hidden tabs, DPR ≤ 2 (≤ 1.5 below 768px), prefers-reduced-motion renders still frames only
// (call api.invalidate() to redraw after a state change), destroy() disposes everything. No WebGL → resolves null.
import { gsap, reduceMotion } from '../../ds/site.js';

export const isSmall = () => innerWidth < 768;

let glOK;
export function hasWebGL() {
  if (glOK !== undefined) return glOK;
  try {
    const c = document.createElement('canvas');
    const g = c.getContext('webgl2') || c.getContext('webgl');
    glOK = !!g;
    g?.getExtension('WEBGL_lose_context')?.loseContext(); // free the probe context right away
  } catch {
    glOK = false;
  }
  return glOK;
}

/** Shared GLSL: hash / value noise / fbm / hsv. */
export const GLSL_NOISE = /* glsl */ `
  float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash21(i), hash21(i+vec2(1,0)), u.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*vnoise(p); p *= 2.03; a *= 0.5; } return v; }
  vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0))*6.0 - 3.0); return c.z*mix(vec3(1.0), clamp(p-1.0, 0.0, 1.0), c.y); }
`;

/**
 * Mounts a WebGL stage in `el`. `build(ctx)` receives { THREE, scene, camera, renderer, el, pointer, small, reduce }
 * and returns { update, resize?, dispose?, onPointer? }.
 */
export function glStage(el, build, { fov = 35, alpha = true, lazy = true, interactive = false, className = '', fade = 1.2, rootMargin = '250px 0px' } = {}) {
  if (!el || !hasWebGL()) return Promise.resolve(null);
  const go = () => start(el, build, { fov, alpha, interactive, className, fade }).catch((err) => {
    console.info('[gl-kit]', err?.message || err);
    return null;
  });
  if (!lazy) return go();
  return new Promise((resolve) => {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        go().then(resolve);
      },
      { rootMargin },
    );
    io.observe(el);
  });
}

async function start(el, build, { fov, alpha, interactive, className, fade }) {
  const THREE = await import('three');
  const small = isSmall();
  const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = `gl-canvas ${className}`.trim();
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: interactive ? 'auto' : 'none', opacity: '0' });
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  const ctx = { THREE, scene, camera, renderer, el, canvas, pointer, pointerTarget, small, reduce: reduceMotion, progress: 0, w: 1, h: 1 };
  const api = (await build(ctx)) || {};

  const resize = () => {
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    ctx.w = w;
    ctx.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    api.resize?.(w, h, ctx);
    if (reduceMotion || !running) draw(1.5, 0);
  };

  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    pointerTarget.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    api.onPointer?.(pointerTarget, e);
  };
  addEventListener('pointermove', onMove, { passive: true });

  let visible = true;
  let running = false;
  let last = performance.now();
  let elapsed = 0;
  const draw = (t, dt) => {
    api.update?.(t, dt, ctx);
    renderer.render(scene, camera);
  };
  const tick = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    elapsed += dt;
    pointer.lerp(pointerTarget, 0.08);
    draw(elapsed, dt);
  };
  const vis = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    last = performance.now();
  });
  vis.observe(el);
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  if (reduceMotion) draw(1.5, 0);
  else {
    running = true;
    gsap.ticker.add(tick);
  }
  requestAnimationFrame(() => (fade ? gsap.to(canvas, { opacity: 1, duration: fade, ease: 'power2.out' }) : (canvas.style.opacity = '1')));

  return {
    ctx,
    THREE,
    api,
    /** Re-render one frame (used under reduced motion after state changes). */
    invalidate() {
      if (!running) draw(1.5, 0);
    },
    destroy() {
      gsap.ticker.remove(tick);
      removeEventListener('pointermove', onMove);
      ro.disconnect();
      vis.disconnect();
      api.dispose?.();
      scene.traverse((o) => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach((m) => m.dispose());
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}

/** Tiny seeded RNG so scenes look the same on every load. */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Smoothly follow a value: returns a function(target, dt) → current. */
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

/** A THREE.Color holding the hex's sRGB numbers as-is (our shaders write display colours, no colour-space pass). */
export const raw = (THREE, hex) => new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace);
