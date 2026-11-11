// Round 2 · WebGL "photo" slots with hover distortion, all drawn by ONE shared offscreen WebGL context.
//
//   cardFX(elements, { colorOf(el) → '#hex', seedOf(el) → number })
//
// Every .ph slot gets a 2D <canvas> holding a generated still (gradient mesh + fbm + grid + grain, tinted by the
// industry). Only the hovered slot re-renders (ripple + RGB split + zoom toward the pointer), so a grid of 20 cards
// costs one WebGL context and ~0 GPU at rest. Reduced motion: still frames only. No WebGL: slots keep their CSS look.
//
//   tiltGlare(el, { max }) — pointer tilt via the CSS `rotate` property (never `transform`, so GSAP Flip can keep
//   animating the card) + a moving glare highlight (--gx/--gy/--go custom properties, styled in CSS).
import { gsap, reduceMotion } from '../../ds/site.js';
import { hasWebGL, GLSL_NOISE } from './gl-kit.js';

let shared = null; // { THREE, renderer, scene, camera, mat }
const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion;

async function getShared() {
  if (shared) return shared;
  shared = (async () => {
    const THREE = await import('three');
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uRes: { value: new THREE.Vector2(1, 1) },
        uColor: { value: new THREE.Color().setStyle('#0792c2', THREE.LinearSRGBColorSpace) },
        uSeed: { value: 0 },
        uTime: { value: 0 },
        uHover: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      },
      vertexShader: /* glsl */ `varying vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec2 uRes; uniform vec3 uColor; uniform float uSeed; uniform float uTime; uniform float uHover; uniform vec2 uMouse;
        varying vec2 vU;
        ${GLSL_NOISE}
        vec3 scene(vec2 uv){
          vec2 p = uv * vec2(uRes.x / uRes.y, 1.0);
          float n = fbm(p * 2.2 + uSeed * 7.0 + vec2(uTime * 0.05, -uTime * 0.03));
          float n2 = fbm(p * 4.0 - uSeed * 3.0 + n * 1.5);
          vec3 deep = vec3(0.055, 0.08, 0.22);
          vec3 c = mix(deep, uColor, smoothstep(0.25, 0.85, n));
          c = mix(c, vec3(1.0, 0.33, 0.15), smoothstep(0.72, 0.95, n2) * 0.35);
          // architectural grid + horizon
          vec2 g = abs(fract(p * 6.0) - 0.5);
          float grid = smoothstep(0.48, 0.5, max(g.x, g.y)) * 0.12;
          float hz = smoothstep(0.012, 0.0, abs(uv.y - 0.32 - n * 0.06)) * 0.5;
          // data bars silhouette
          float bx = floor(uv.x * 14.0);
          float bh = 0.12 + hash21(vec2(bx, uSeed)) * 0.38 * (0.6 + 0.4 * uv.x);
          float bar = step(uv.y, bh) * step(0.18, fract(uv.x * 14.0)) * step(fract(uv.x * 14.0), 0.82);
          c = mix(c, c * 1.25 + 0.06, bar * 0.55);
          c += grid + hz * uColor;
          return c;
        }
        void main(){
          vec2 uv = vU;
          vec2 d = uv - uMouse;
          float dist = length(d * vec2(uRes.x / uRes.y, 1.0));
          float ripple = sin(dist * 38.0 - uTime * 6.0) * exp(-dist * 5.0) * 0.012 * uHover;
          uv = uMouse + (uv - uMouse) * (1.0 - 0.06 * uHover) + normalize(d + 1e-5) * ripple;
          float split = 0.006 * uHover * (0.5 + exp(-dist * 4.0));
          vec3 c;
          c.r = scene(uv + vec2(split, 0.0)).r;
          c.g = scene(uv).g;
          c.b = scene(uv - vec2(split, 0.0)).b;
          float vig = smoothstep(1.15, 0.35, length(vU - 0.5) * 1.4);
          float grain = (hash21(vU * uRes + uTime) - 0.5) * 0.05;
          c = c * (0.72 + 0.28 * vig) + grain + exp(-dist * 6.0) * 0.12 * uHover;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    return { THREE, renderer, scene, camera, mat };
  })();
  return shared;
}

function draw(s, slot) {
  const { renderer, scene, camera, mat } = s;
  const { canvas, state } = slot;
  const r = slot.el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const w = Math.min(1100, Math.round(r.width * dpr));
  const h = Math.round((w / r.width) * r.height);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderer.setSize(w, h, false);
  mat.uniforms.uRes.value.set(w, h);
  mat.uniforms.uColor.value.setStyle(state.color, s.THREE.LinearSRGBColorSpace);
  mat.uniforms.uSeed.value = state.seed;
  mat.uniforms.uTime.value = state.time;
  mat.uniforms.uHover.value = state.hover;
  mat.uniforms.uMouse.value.set(state.mx, state.my);
  renderer.render(scene, camera);
  slot.ctx2d.drawImage(renderer.domElement, 0, 0, w, h);
}

export function cardFX(elements, { colorOf = () => '#0792c2', seedOf = (el, i) => i + 1 } = {}) {
  const els = [...elements].filter((el) => el && !el.querySelector(':scope > canvas.cardfx'));
  if (!els.length || !hasWebGL()) return;
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        mount(e.target, els.indexOf(e.target));
      }),
    { rootMargin: '300px 0px' },
  );
  els.forEach((el) => io.observe(el));

  async function mount(el, i) {
    const s = await getShared().catch(() => null);
    if (!s || !el.isConnected) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'cardfx';
    canvas.setAttribute('aria-hidden', 'true');
    el.append(canvas);
    el.classList.add('has-cardfx');
    const slot = { el, canvas, ctx2d: canvas.getContext('2d'), state: { color: colorOf(el), seed: seedOf(el, i), time: 2 + i * 1.7, hover: 0, mx: 0.5, my: 0.5 } };
    draw(s, slot);
    gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out' });
    new ResizeObserver(() => draw(s, slot)).observe(el);
    if (!fine()) return;
    const host = el.closest('[data-fx-host]') || el;
    let tween = null;
    const loop = () => {
      slot.state.time += gsap.ticker.deltaRatio() / 60;
      draw(s, slot);
    };
    host.addEventListener('pointerenter', () => {
      gsap.ticker.add(loop);
      tween?.kill();
      tween = gsap.to(slot.state, { hover: 1, duration: 0.6, ease: 'power3.out' });
    });
    host.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(slot.state, { mx: (e.clientX - r.left) / r.width, my: 1 - (e.clientY - r.top) / r.height, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    });
    host.addEventListener('pointerleave', () => {
      tween?.kill();
      tween = gsap.to(slot.state, { hover: 0, duration: 0.7, ease: 'power2.out', onComplete: () => gsap.ticker.remove(loop) });
    });
  }
}

export function tiltGlare(el, { max = 6, rotate = true } = {}) {
  if (!el || el.dataset.glare) return;
  el.dataset.glare = '1';
  const glare = document.createElement('span');
  glare.className = 'fx-glare';
  glare.setAttribute('aria-hidden', 'true');
  el.append(glare);
  if (!fine()) return;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const rx = -(y - 0.5) * max * 2;
    const ry = (x - 0.5) * max * 2;
    const ang = Math.hypot(rx, ry);
    if (rotate) el.style.rotate = ang > 0.01 ? `${rx / ang} ${ry / ang} 0 ${ang.toFixed(2)}deg` : '';
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    el.style.setProperty('--go', '1');
  });
  el.addEventListener('pointerleave', () => {
    if (rotate) el.style.rotate = '';
    el.style.setProperty('--go', '0');
  });
}
