// Home "world": ONE fixed full-page WebGL canvas behind the content.
//  - ~24k particles (9k on phones) that form the Savvy isologo (sampled from the real SVG),
//    explode into a flowing field and re-form per section: 7-node loop, funnel, bar chart, logo.
//  - The page background colour (light <-> dark) is painted by this canvas and scrubbed with scroll.
//  - Industry cards: shader planes that follow DOM rects (procedural "photography", velocity bend, hover ripple).
//  - Bloom (UnrealBloomPass) only where the page is dark and only on desktop.
// three.js is imported lazily; the canvas pauses when the tab is hidden.
import { gsap, ScrollTrigger, lenis } from '../../ds/site.js';

const SHAPES = ['logo', 'field', 'loop', 'funnel', 'bars'];
export const TONES = { dark: '#070b1f', light: '#f4f7fb', white: '#ffffff' };

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function mulberry(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => (r() + r() + r() - 1.5) / 1.5;

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Point sets (all in a unit space roughly [-1,1])
// ---------------------------------------------------------------------------
function logoPoints(THREE, SVGLoader, svg, n, rand) {
  const { paths } = new SVGLoader().parse(svg);
  const shapes = paths.flatMap((p) => p.toShapes());
  const geo = new THREE.ShapeGeometry(shapes, 18);
  const pos = geo.attributes.position;
  const index = geo.index ? geo.index.array : [...Array(pos.count).keys()];
  const tris = [];
  let total = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < index.length; i += 3) {
    a.fromBufferAttribute(pos, index[i]);
    b.fromBufferAttribute(pos, index[i + 1]);
    c.fromBufferAttribute(pos, index[i + 2]);
    const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
    total += area;
    tris.push({ a: a.clone(), b: b.clone(), c: c.clone(), cum: total });
  }
  // contours for crisp edges
  const segs = [];
  let len = 0;
  shapes.forEach((s) => {
    const { shape, holes } = s.extractPoints(28);
    [shape, ...holes].forEach((ring) => {
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i], q = ring[(i + 1) % ring.length];
        len += p.distanceTo(q);
        segs.push({ p, q, cum: len });
      }
    });
  });
  geo.dispose();
  const out = new Float32Array(n * 3);
  const pick = (arr, v) => {
    let lo = 0, hi = arr.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].cum < v) lo = mid + 1;
      else hi = mid;
    }
    return arr[lo];
  };
  const S = 1 / 179;
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (i % 4 === 0) {
      const s = pick(segs, rand() * len);
      const t = rand();
      x = s.p.x + (s.q.x - s.p.x) * t;
      y = s.p.y + (s.q.y - s.p.y) * t;
      z = gauss(rand) * 0.012;
    } else {
      const tr = pick(tris, rand() * total);
      let u = rand(), v = rand();
      if (u + v > 1) (u = 1 - u), (v = 1 - v);
      x = tr.a.x + (tr.b.x - tr.a.x) * u + (tr.c.x - tr.a.x) * v;
      y = tr.a.y + (tr.b.y - tr.a.y) * u + (tr.c.y - tr.a.y) * v;
      // a thin slab: front face, back face and a little volume between
      const layer = rand();
      z = layer < 0.55 ? 0.04 : layer < 0.85 ? -0.04 : (rand() - 0.5) * 0.08;
    }
    out[i * 3] = (x - 89) * S * 2;
    out[i * 3 + 1] = -(y - 89.5) * S * 2;
    out[i * 3 + 2] = z;
  }
  return out;
}

function buildSets(n, rand) {
  const field = new Float32Array(n * 3);
  const loop = new Float32Array(n * 3);
  const funnel = new Float32Array(n * 3);
  const bars = new Float32Array(n * 3);
  const tag = new Float32Array(n * 3); // node, bar, ring angle
  const rnd = new Float32Array(n * 4);
  const BAR_H = [0.32, 0.44, 0.52, 0.66, 0.78, 0.92, 1.12];
  for (let i = 0; i < n; i++) {
    rnd.set([rand(), rand(), rand(), rand()], i * 4);
    // field: a broad, deep river of points
    field.set([(rand() * 2 - 1) * 2.2, gauss(rand) * 0.32, -rand() * 1.6 + 0.4], i * 3);
    // loop: ring + 7 node clusters + orbit dust
    let node = -1;
    let ang = rand() * Math.PI * 2;
    const k = rand();
    if (k < 0.55) {
      const r = 1 + gauss(rand) * 0.018;
      loop.set([Math.cos(ang) * r, Math.sin(ang) * r, gauss(rand) * 0.02], i * 3);
    } else if (k < 0.9) {
      node = i % 7;
      ang = Math.PI / 2 - (node / 7) * Math.PI * 2;
      const u = rand() * Math.PI * 2, v = Math.acos(2 * rand() - 1), rr = 0.05 + Math.pow(rand(), 2) * 0.08;
      loop.set([Math.cos(ang) + rr * Math.sin(v) * Math.cos(u), Math.sin(ang) + rr * Math.sin(v) * Math.sin(u), rr * Math.cos(v)], i * 3);
    } else {
      const r = 0.45 + rand() * 1.1;
      loop.set([Math.cos(ang) * r, Math.sin(ang) * r, gauss(rand) * 0.25], i * 3);
      node = -2;
    }
    // funnel: parametric (theta, v, jitter) — evaluated in the shader so it can flow
    funnel.set([rand() * Math.PI * 2, rand(), rand()], i * 3);
    // bars: 7 ascending columns, edges emphasised
    const bi = i % 7;
    const h = BAR_H[bi];
    const bx = -0.84 + bi * 0.28;
    const w = 0.09;
    let px = (rand() * 2 - 1) * w, py = rand() * h, pz = (rand() * 2 - 1) * w;
    if (rand() < 0.45) {
      // snap to an edge of the column
      if (rand() < 0.5) px = Math.sign(px) * w;
      else pz = Math.sign(pz) * w;
      if (rand() < 0.25) py = rand() < 0.5 ? 0 : h;
    }
    bars.set([bx + px, py - 0.55, pz], i * 3);
    tag.set([node, bi, ang], i * 3);
  }
  return { field, loop, funnel, bars, tag, rnd };
}

const VERT = /* glsl */ `
  attribute vec3 aField; attribute vec3 aLoop; attribute vec3 aFunnel; attribute vec3 aBars;
  attribute vec4 aRnd; attribute vec3 aTag;
  uniform float uTime, uScatter, uDark, uPR, uSize, uNode, uLevel, uBar, uAlpha, uW4;
  uniform vec4 uW;
  uniform vec3 uPointer;
  uniform vec3 uC1, uC2, uC3, uC4, uAcc;
  varying vec3 vCol; varying float vA;
  void main(){
    float t = uTime;
    vec3 pL = position;
    pL.z += sin(t * 1.3 + aRnd.x * 6.2831) * 0.012;
    pL.xy *= 1.0 + sin(t * 0.8) * 0.006;

    vec3 pF = aField;
    pF.x = mod(pF.x + t * 0.035 + 2.2, 4.4) - 2.2;
    pF.y += sin(pF.x * 2.6 + t * 0.55) * 0.09 + cos(pF.z * 3.4 - t * 0.45) * 0.06 + sin((pF.x + pF.z) * 1.7 + t * 0.3) * 0.07;

    float ang = t * 0.12;
    mat2 R = mat2(cos(ang), sin(ang), -sin(ang), cos(ang));
    vec3 pO = aLoop; pO.xy = R * pO.xy;

    float v = fract(aFunnel.y + t * 0.035);
    float band = floor(v * 7.0);
    float stream = step(0.88, aFunnel.z);
    float vb = mix((band + 0.5 + (fract(v * 7.0) - 0.5) * 0.42) / 7.0, v, stream);
    float r = mix(mix(0.8, 0.22, vb) * (1.0 + (aFunnel.z - 0.5) * 0.08), (aFunnel.z - 0.88) * 0.9, stream);
    float th = aFunnel.x + t * (0.18 + vb * 0.6);
    vec3 pU = vec3(cos(th) * r, 0.6 - vb * 1.2, sin(th) * r);

    vec3 pB = aBars;
    pB.y += sin(t * 0.9 + aRnd.y * 6.2831) * 0.004;

    vec3 p = pL * uW.x + pF * uW.y + pO * uW.z + pU * uW.w + pB * uW4;

    vec3 dir = aRnd.xyz * 2.0 - 1.0;
    p += dir * uScatter * (0.5 + aRnd.w * 1.1);
    p += vec3(sin(t * 0.7 + aRnd.y * 9.0), cos(t * 0.6 + aRnd.z * 9.0), sin(t * 0.5 + aRnd.x * 9.0)) * uScatter * 0.2;

    vec4 wp = modelMatrix * vec4(p, 1.0);
    vec2 d = wp.xy - uPointer.xy;
    float f = exp(-dot(d, d) * 1.6) * uPointer.z;
    wp.xy += normalize(d + 1e-4) * f * 0.55;
    wp.z += f * 0.5;
    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;

    float isRing = step(aTag.x, -0.5) * step(-1.5, aTag.x);
    float dA = mod(aTag.z + ang - t * 0.9, 6.2831853);
    float comet = isRing * exp(-(6.2831853 - dA) * 2.2) * uW.z;
    float hiNode = (1.0 - step(0.5, abs(aTag.x - uNode))) * uW.z;
    float hiLevel = (1.0 - step(0.5, abs(band - uLevel))) * (1.0 - stream) * uW.w;
    float hiBar = (1.0 - step(0.5, abs(aTag.y - uBar))) * uW4;
    float hi = clamp(hiNode + hiLevel + hiBar + comet, 0.0, 1.0);

    float g = clamp(p.x * 0.28 + p.y * 0.36 + 0.5, 0.0, 1.0);
    vec3 col = mix(mix(uC1, uC2, g), mix(uC3, uC4, g), uDark);
    float spark = step(0.975, aRnd.w);
    col = mix(col, uAcc, max(hi * 0.9, spark * 0.85));
    vCol = col;
    vA = uAlpha * (0.5 + aRnd.w * 0.5) * (1.0 + hi * 0.8) * (1.0 - uScatter * 0.25);
    gl_PointSize = uSize * uPR * (0.55 + aRnd.w * 0.9) * (1.0 + hi * 1.3 + uScatter * 0.5) * (10.0 / -mv.z);
  }
`;
const FRAG = /* glsl */ `
  varying vec3 vCol; varying float vA;
  void main(){
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    gl_FragColor = vec4(vCol, smoothstep(0.5, 0.12, r) * vA);
    #include <colorspace_fragment>
  }
`;

const FILM_VERT = /* glsl */ `
  uniform float uVel, uHover; varying vec2 vUv;
  void main(){
    vUv = uv;
    vec3 p = position;
    p.x += sin(uv.y * 3.14159) * uVel * 0.08;
    p.y += sin(uv.x * 3.14159) * uHover * 0.012;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const FILM_FRAG = /* glsl */ `
  uniform vec3 uA, uB, uC; uniform float uTime, uHover, uSeed, uVel, uRadius, uAlpha; uniform vec2 uMouse, uSize;
  varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
  void main(){
    vec2 uv = vUv;
    float asp = uSize.x / uSize.y;
    vec2 m = (uv - uMouse) * vec2(asp, 1.0);
    float d = length(m);
    uv += normalize(m + 1e-4) * sin(d * 28.0 - uTime * 5.0) * 0.01 * uHover * smoothstep(0.7, 0.0, d);
    uv = (uv - 0.5) * (1.0 - uHover * 0.08) + 0.5;
    vec2 q = uv * vec2(asp * 1.6, 2.2);
    float a = fbm(q + vec2(uSeed, uTime * 0.04));
    float b = fbm(q * 1.7 - a * 1.6 + vec2(uTime * 0.03, uSeed));
    vec3 col = mix(uA, uB, smoothstep(0.2, 0.8, a));
    col = mix(col, uC, smoothstep(0.5, 0.92, b) * 0.85);
    // light sweep
    float sweep = uv.x * 0.8 + uv.y * 0.6 - fract(uTime * 0.06 + uSeed * 0.13) * 2.6 + 0.4;
    col += exp(-sweep * sweep * 90.0) * 0.18;
    // chromatic edge with velocity
    col.r += abs(uVel) * 0.12 * smoothstep(0.3, 1.0, b);
    // micro grid + vignette
    vec2 gp = abs(fract(vUv * uSize / 36.0) - 0.5);
    col += smoothstep(0.485, 0.5, max(gp.x, gp.y)) * 0.05;
    col *= mix(0.55, 1.0, smoothstep(0.0, 0.55, vUv.y));
    col *= 1.0 + uHover * 0.12;
    // rounded corners in px
    vec2 px = vUv * uSize;
    vec2 qq = abs(px - uSize * 0.5) - (uSize * 0.5 - uRadius);
    float sd = length(max(qq, 0.0)) - uRadius;
    gl_FragColor = vec4(col, (1.0 - smoothstep(-1.0, 0.5, sd)) * uAlpha);
    #include <colorspace_fragment>
  }
`;

// ---------------------------------------------------------------------------
export async function initWorld({ host, sections, films = [], reduce = false, onStats } = {}) {
  if (!host || !hasWebGL()) return null;
  const THREE = await import('three');
  const { SVGLoader } = await import('three/addons/loaders/SVGLoader.js');
  const mobile = matchMedia('(max-width: 767px)').matches;
  const N = mobile ? 9000 : 24000;
  const useBloom = !mobile && !reduce;

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;
  const canvas = renderer.domElement;
  canvas.className = 'world__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 60);
  camera.position.set(0, 0, 10);

  // ---- particles
  const rand = mulberry(7);
  const svg = await fetch('/brand/isologo-gradient.svg').then((r) => r.text());
  const logo = logoPoints(THREE, SVGLoader, svg, N, rand);
  const sets = buildSets(N, rand);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(logo, 3));
  geo.setAttribute('aField', new THREE.BufferAttribute(sets.field, 3));
  geo.setAttribute('aLoop', new THREE.BufferAttribute(sets.loop, 3));
  geo.setAttribute('aFunnel', new THREE.BufferAttribute(sets.funnel, 3));
  geo.setAttribute('aBars', new THREE.BufferAttribute(sets.bars, 3));
  geo.setAttribute('aTag', new THREE.BufferAttribute(sets.tag, 3));
  geo.setAttribute('aRnd', new THREE.BufferAttribute(sets.rnd, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  const U = {
    uTime: { value: 0 },
    uScatter: { value: 0 },
    uDark: { value: 1 },
    uPR: { value: renderer.getPixelRatio() },
    uSize: { value: mobile ? 2.2 : 2.0 },
    uNode: { value: 0 },
    uLevel: { value: -1 },
    uBar: { value: -1 },
    uAlpha: { value: 1 },
    uW: { value: new THREE.Vector4(1, 0, 0, 0) },
    uW4: { value: 0 },
    uPointer: { value: new THREE.Vector3(99, 99, 0) },
    uC1: { value: new THREE.Color('#14173D') },
    uC2: { value: new THREE.Color('#0396C7') },
    uC3: { value: new THREE.Color('#2f6bff') },
    uC4: { value: new THREE.Color('#8fe6ff') },
    uAcc: { value: new THREE.Color('#FF5527') },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ---- bloom (desktop)
  let composer = null, bloom = null;
  if (useBloom) {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
    ]);
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.7, 0.32, 0.42);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ---- film planes (overlay, pixel-space ortho camera, drawn after bloom)
  const overlay = new THREE.Scene();
  const ortho = new THREE.OrthographicCamera(0, innerWidth, 0, -innerHeight, -10, 10);
  const planeGeo = new THREE.PlaneGeometry(1, 1, 24, 24);
  const planes = films.map((f, i) => {
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      uniforms: {
        uA: { value: new THREE.Color(f.colors[0]) },
        uB: { value: new THREE.Color(f.colors[1]) },
        uC: { value: new THREE.Color(f.colors[2]) },
        uTime: { value: 0 },
        uHover: { value: 0 },
        uSeed: { value: i * 3.7 + 1.3 },
        uVel: { value: 0 },
        uRadius: { value: 24 },
        uAlpha: { value: 1 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uSize: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: FILM_VERT,
      fragmentShader: FILM_FRAG,
    });
    const mesh = new THREE.Mesh(planeGeo, m);
    mesh.frustumCulled = false;
    overlay.add(mesh);
    const hover = { v: 0 };
    const link = f.link;
    if (link && !reduce) {
      link.addEventListener('pointerenter', () => gsap.to(hover, { v: 1, duration: 0.8, ease: 'expo.out' }));
      link.addEventListener('pointerleave', () => gsap.to(hover, { v: 0, duration: 0.8, ease: 'expo.out' }));
      link.addEventListener('pointermove', (e) => {
        const r = f.el.getBoundingClientRect();
        m.uniforms.uMouse.value.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
      });
      link.addEventListener('focus', () => gsap.to(hover, { v: 1, duration: 0.6 }));
      link.addEventListener('blur', () => gsap.to(hover, { v: 0, duration: 0.6 }));
    }
    return { mesh, m, el: f.el, hover };
  });

  // ---- section map (scroll -> shape weights / anchor / tone)
  const col = new THREE.Color();
  const clearTmp = new THREE.Color();
  const toneCols = Object.fromEntries(Object.entries(TONES).map(([k, v]) => [k, new THREE.Color(v)]));
  let marks = [];
  const measure = () => {
    marks = sections.map((s) => {
      const box = s.el.parentElement?.classList.contains('pin-spacer') ? s.el.parentElement : s.el;
      const r = box.getBoundingClientRect();
      return { top: r.top + scrollY, bottom: r.bottom + scrollY };
    });
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', () => {});
  ScrollTrigger.addEventListener('refresh', measure);
  addEventListener('load', measure);

  /** For the current scroll: section a, section b and the blend t between them. */
  const locate = () => {
    const vh = innerHeight;
    const probe = scrollY + vh * 0.5;
    const z = vh * 0.32;
    for (let i = 0; i < marks.length - 1; i++) {
      const b = marks[i].bottom;
      if (probe < b - z) return { a: i, b: i, t: 0, tt: 0 };
      if (probe < b + z) {
        const t = (probe - (b - z)) / (2 * z);
        return { a: i, b: i + 1, t, tt: clamp01((probe - (b - vh * 0.04)) / (vh * 0.08)) };
      }
    }
    return { a: marks.length - 1, b: marks.length - 1, t: 0, tt: 0 };
  };

  const anchorOf = (s) => (mobile ? s.m : s.d);
  const cur = { x: 0, y: 0, s: 3, rx: 0, ry: 0, a: 1, w: [1, 0, 0, 0, 0], scatter: 0, dark: 1 };
  let first = true;
  const pointer = new THREE.Vector2(99, 99);
  const pointerT = new THREE.Vector2(99, 99);
  let push = 0, pushT = 0;
  if (!reduce) {
    addEventListener(
      'pointermove',
      (e) => {
        pointerT.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
        pushT = e.pointerType === 'mouse' ? 1 : 0.6;
      },
      { passive: true },
    );
    document.addEventListener('pointerleave', () => (pushT = 0));
  }

  const state = { node: 0, level: -1, bar: -1, extraScatter: 0 };
  const targets = { node: 0, level: -1, bar: -1 };

  // ---- resize
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    bloom?.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    ortho.right = w;
    ortho.bottom = -h;
    ortho.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  // ---- frame
  const clock = { t: 0, last: performance.now() };
  let frames = 0, acc = 0, statT = 0, slow = 0;
  const halfH = Math.tan(THREE.MathUtils.degToRad(17.5)) * 10;

  const frame = (dtMs) => {
    const dt = Math.min(dtMs / 1000, 0.05);
    if (!reduce) clock.t += dt;
    const t = reduce ? 6 : clock.t;
    const L = locate();
    const A = sections[L.a], B = sections[L.b];
    const st = smooth(L.t);
    const aa = anchorOf(A), bb = anchorOf(B);
    const target = {
      x: aa[0] + (bb[0] - aa[0]) * st,
      y: aa[1] + (bb[1] - aa[1]) * st,
      s: aa[2] + (bb[2] - aa[2]) * st,
      rx: aa[3] + (bb[3] - aa[3]) * st,
      ry: aa[4] + (bb[4] - aa[4]) * st,
      a: aa[5] + (bb[5] - aa[5]) * st,
    };
    const w = SHAPES.map((k) => (A.shape === k ? 1 - st : 0) + (B.shape === k ? st : 0));
    const scatterT = A.shape !== B.shape ? Math.sin(Math.PI * st) * 1.0 : 0;
    const k = first || reduce ? 1 : 1 - Math.pow(0.0015, dt); // frame-rate independent smoothing
    first = false;
    for (const key of ['x', 'y', 's', 'rx', 'ry', 'a']) cur[key] += (target[key] - cur[key]) * k;
    for (let i = 0; i < 5; i++) cur.w[i] += (w[i] - cur.w[i]) * k;
    cur.scatter += (scatterT + state.extraScatter - cur.scatter) * k;

    // background tone
    const ta = toneCols[A.tone], tb = toneCols[B.tone];
    col.copy(ta).lerp(tb, L.tt);
    const dark = 1 - Math.min(1, col.r * 0.2126 + col.g * 0.7152 + col.b * 0.0722) * 1.15;
    cur.dark = clamp01(dark);
    mat.blending = cur.dark > 0.5 ? THREE.AdditiveBlending : THREE.NormalBlending;
    onStats?.tone(col.getStyle());

    for (const key of ['node', 'level', 'bar']) state[key] = targets[key];
    U.uTime.value = t;
    U.uW.value.set(cur.w[0], cur.w[1], cur.w[2], cur.w[3]);
    U.uW4.value = cur.w[4];
    U.uScatter.value = cur.scatter;
    U.uDark.value = cur.dark;
    U.uAlpha.value = cur.a * (cur.dark > 0.5 ? 0.42 : 0.9);
    U.uNode.value = state.node;
    U.uLevel.value = state.level;
    U.uBar.value = state.bar < 0 ? Math.floor((t * 0.8) % 7) : state.bar;

    points.position.set(cur.x, cur.y, 0);
    points.scale.setScalar(cur.s);
    pointer.lerp(pointerT, reduce ? 1 : 0.12);
    push += (pushT - push) * 0.08;
    points.rotation.set(cur.rx - pointer.y * 0.08 * push, cur.ry + Math.sin(t * 0.25) * 0.12 * cur.w[0] + pointer.x * 0.12 * push, 0);
    camera.position.x = pointer.x * 0.25 * push;
    camera.position.y = pointer.y * 0.15 * push;
    camera.lookAt(0, 0, 0);
    U.uPointer.value.set(pointer.x * halfH * camera.aspect, pointer.y * halfH, push);

    const viaComposer = composer && cur.dark > 0.08;
    // the composer's linear target gets the clear colour converted once more on output: pre-linearise it
    renderer.setClearColor(viaComposer ? clearTmp.copy(col).convertSRGBToLinear() : col, 1);
    renderer.clear();
    if (viaComposer) {
      bloom.strength = 0.75 * cur.dark;
      composer.render();
    } else renderer.render(scene, camera);

    // film planes
    const vel = lenis ? gsap.utils.clamp(-1, 1, lenis.velocity / 40) : 0;
    let any = false;
    for (const p of planes) {
      const r = p.el.getBoundingClientRect();
      const vis = r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
      p.mesh.visible = vis;
      if (!vis) continue;
      any = true;
      p.mesh.position.set(r.left + r.width / 2, -(r.top + r.height / 2), 0);
      p.mesh.scale.set(r.width, r.height, 1);
      const u = p.m.uniforms;
      u.uSize.value.set(r.width, r.height);
      u.uTime.value = t;
      u.uHover.value = p.hover.v;
      u.uVel.value += (vel - u.uVel.value) * 0.1;
      u.uRadius.value = parseFloat(getComputedStyle(p.el).borderTopLeftRadius) || 24;
    }
    if (any) renderer.render(overlay, ortho);

    // stats
    frames++;
    acc += dtMs;
    statT += dtMs;
    if (statT > 500) {
      const avg = acc / frames;
      // adaptive quality: slow devices first lose bloom, then half the particles
      if (!reduce && avg > 34 && ++slow >= 3) {
        slow = 0;
        if (composer) (composer.dispose(), (composer = null));
        else if (geo.drawRange.count === Infinity || geo.drawRange.count > N / 2) geo.setDrawRange(0, Math.floor(N / 2));
      } else if (avg <= 34) slow = 0;
      onStats?.fps(Math.round(1000 / avg), Math.min(N, geo.drawRange.count));
      frames = 0;
      acc = 0;
      statT = 0;
    }
  };

  let last = performance.now();
  const tick = () => {
    if (document.hidden) return;
    const now = performance.now();
    frame(now - last);
    last = now;
  };
  if (reduce) {
    // static frames: redraw only when something moves
    let raf = 0;
    const req = () => (raf ||= requestAnimationFrame(() => ((raf = 0), frame(16))));
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', req);
    ScrollTrigger.addEventListener('refresh', req);
    req();
  } else gsap.ticker.add(tick);

  document.documentElement.classList.add('has-world');
  gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power2.out' });

  const api = {
    renderer,
    bloom,
    count: N,
    setNode: (i) => (targets.node = i),
    setLevel: (i) => (targets.level = i),
    setBar: (i) => (targets.bar = i),
    burst(amount = 0.6) {
      if (reduce) return;
      gsap.fromTo(state, { extraScatter: amount }, { extraScatter: 0, duration: 1.6, ease: 'expo.out' });
    },
    refresh: measure,
  };
  return api;
}
