// One fixed canvas, one plane per [data-gl] element. Planes are positioned in
// pixel space from getBoundingClientRect() every frame Lenis scrolls, and a
// shader bends them with scroll velocity + a hover ripple. Renders on demand.
import * as THREE from 'three';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { createLab } from '../_shared/lab.js';

const lab = createLab('05-webgl-dom-images');
const canvas = document.querySelector('canvas.gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
// Orthographic camera in CSS pixels: (0,0) at the viewport centre
const camera = new THREE.OrthographicCamera();
camera.position.z = 10;

function makeTexture(i) {
  const c = document.createElement('canvas');
  c.width = 800; c.height = 600;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 600, 800, 0);
  grad.addColorStop(0, '#14173d'); grad.addColorStop(1, ['#0396c7', '#5cc8ec', '#2a6fdb', '#00b3a4'][i]);
  g.fillStyle = grad; g.fillRect(0, 0, 800, 600);
  g.fillStyle = '#fff'; g.font = 'bold 160px system-ui'; g.fillText(`0${i + 1}`, 60, 540);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
const items = [...document.querySelectorAll('[data-gl]')].map((el, i) => {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: makeTexture(i) }, uVelocity: { value: 0 }, uHover: { value: 0 }, uMouse: { value: new THREE.Vector2(0.5, 0.5) } },
    vertexShader: /* glsl */ `
      uniform float uVelocity; varying vec2 vUv;
      void main() {
        vUv = uv; vec3 p = position;
        p.y += sin(uv.x * 3.14159) * uVelocity * 0.0015;   // bend with scroll speed
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex; uniform float uHover; uniform vec2 uMouse; varying vec2 vUv;
      void main() {
        float d = distance(vUv, uMouse);
        vec2 uv = vUv + normalize(vUv - uMouse + 1e-4) * sin(d * 30.0) * 0.015 * uHover * smoothstep(0.5, 0.0, d);
        // RGB split proportional to hover
        float r = texture2D(uTex, uv + vec2(0.01 * uHover, 0.0)).r;
        vec2 gb = texture2D(uTex, uv).gb;
        gl_FragColor = vec4(r, gb, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    material.uniforms.uMouse.value.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    invalidate();
  });
  el.addEventListener('pointerenter', () => gsap.to(material.uniforms.uHover, { value: 1, duration: 0.5, onUpdate: invalidate }));
  el.addEventListener('pointerleave', () => gsap.to(material.uniforms.uHover, { value: 0, duration: 0.5, onUpdate: invalidate }));
  return { el, mesh, material };
});

function layout() {
  const w = innerWidth, h = innerHeight;
  Object.assign(camera, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
function sync() {
  for (const { el, mesh } of items) {
    const r = el.getBoundingClientRect();
    mesh.scale.set(r.width, r.height, 1);
    mesh.position.set(r.left + r.width / 2 - innerWidth / 2, innerHeight / 2 - r.top - r.height / 2, 0);
    mesh.visible = r.bottom > -100 && r.top < innerHeight + 100; // cull off-screen planes
  }
}

// --- render on demand ---
let renders = 0, needsRender = true;
function invalidate() { needsRender = true; }
gsap.ticker.add(() => {
  if (!needsRender) return;
  needsRender = false;
  sync();
  renderer.render(scene, camera);
  renders++;
});

const lenis = new Lenis();
gsap.ticker.add((t) => lenis.raf(t * 1000));
lenis.on('scroll', ({ velocity }) => {
  for (const it of items) it.material.uniforms.uVelocity.value = velocity;
  invalidate();
});
addEventListener('resize', () => { layout(); invalidate(); });
layout();
document.documentElement.classList.add('gl-ready');

// --- measurements ---
await new Promise((r) => setTimeout(r, 300));
const idleStart = renders;
await new Promise((r) => setTimeout(r, 1000));
lab.set('rendersWhileIdle1s', renders - idleStart);

lenis.scrollTo(900, { immediate: true });
await new Promise((r) => setTimeout(r, 200));
// After a scroll, compare the plane's projected rect with the DOM rect
const errs = items.map(({ el, mesh }) => {
  const r = el.getBoundingClientRect();
  const v = new THREE.Vector3(-0.5, 0.5, 0).applyMatrix4(mesh.matrixWorld).project(camera);
  const left = (v.x + 1) / 2 * innerWidth, top = (1 - v.y) / 2 * innerHeight;
  return Math.abs(left - r.left) + Math.abs(top - r.top);
});
lab.set('maxDomSyncErrorPx', +Math.max(...errs).toFixed(2));
lab.set('drawCallsPerFrame', renderer.info.render.calls);
lab.set('visiblePlanes', items.filter((i) => i.mesh.visible).length);
lab.set('totalRenders', renders);
lab.finish();
