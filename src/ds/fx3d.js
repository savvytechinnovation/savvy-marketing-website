// Savvy 3D kit — reusable Three.js scenes for any page built on the design system.
//
//   import { mount3D } from '/src/ds/fx3d.js';
//   mount3D(el, { scene: 'logo' | 'field' | 'orb' | 'rings' | 'ribbons', theme: 'light' | 'dark', scrub: true });
//
// - `el` is an existing box from the Figma layout (a .ph media slot, a section background layer…).
//   The canvas fills it absolutely; the layout never changes. Give it `position:relative` (or absolute).
// - three.js is loaded lazily (dynamic import) the first time a scene gets near the viewport.
// - Rendering pauses off-screen and when the tab is hidden; DPR is capped at 2.
// - prefers-reduced-motion: renders one still frame, no pointer/scroll motion.
// - `scrub: true` maps the element's scroll progress (0→1 while it crosses the viewport) to the scene.
// - Returns a promise of { destroy(), setProgress(p) }.
import { gsap, ScrollTrigger, reduceMotion } from './site.js';

const BRAND = { navy: '#14173D', cyan: '#0396C7', primary: '#0792C2', dark: '#293BAA', accent: '#FF5527' };

export function mount3D(el, opts = {}) {
  if (!el) return Promise.resolve(null);
  return new Promise((resolve) => {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        start(el, opts).then(resolve, (err) => {
          console.warn('[fx3d]', err);
          resolve(null);
        });
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
  });
}

/** Mount every [data-3d="scene"] element on the page (options via data-3d-theme / data-3d-scrub). */
export function autoMount3D(root = document) {
  return Promise.all(
    [...root.querySelectorAll('[data-3d]')].map((el) =>
      mount3D(el, { scene: el.dataset['3d'], theme: el.dataset['3dTheme'], scrub: el.hasAttribute('data-3d-scrub') }),
    ),
  );
}

async function start(el, opts) {
  const THREE = await import('three');
  const supportsGL = (() => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  })();
  if (!supportsGL) return null;

  const { scene: kind = 'field', theme = 'light', scrub = false } = opts;
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'fx3d-canvas';
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none' });
  el.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const ctx = { THREE, scene, camera, renderer, el, theme, pointer: new THREE.Vector2(), progress: 0 };
  const builder = SCENES[kind] || SCENES.field;
  const api = await builder(ctx);

  // Size
  const resize = () => {
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    api.resize?.(w, h);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  // Pointer (smoothed), relative to the element
  const target = new THREE.Vector2();
  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    target.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  };
  if (!reduceMotion) addEventListener('pointermove', onMove, { passive: true });

  // Scroll progress
  let st;
  if (scrub && !reduceMotion) {
    st = ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onUpdate: (s) => (ctx.progress = s.progress) });
  }

  // Loop: only while visible and tab active
  let visible = true;
  const vis = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  vis.observe(el);
  const timer = new THREE.Timer();
  timer.connect?.(document);
  const tick = () => {
    if (!visible || document.hidden) return;
    timer.update();
    ctx.pointer.lerp(target, 0.06);
    api.update(timer.getElapsed(), timer.getDelta(), ctx);
    renderer.render(scene, camera);
  };
  if (reduceMotion) {
    api.update(1.5, 0, ctx);
    renderer.render(scene, camera);
  } else gsap.ticker.add(tick);

  // Fade the canvas in once the first frame is drawn
  canvas.style.opacity = '0';
  requestAnimationFrame(() => gsap.to(canvas, { opacity: 1, duration: 1.2, ease: 'power2.out' }));

  return {
    setProgress: (p) => (ctx.progress = p),
    destroy() {
      gsap.ticker.remove(tick);
      removeEventListener('pointermove', onMove);
      ro.disconnect();
      vis.disconnect();
      st?.kill();
      scene.traverse((o) => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach((m) => m.dispose());
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------
const SCENES = {
  // Extruded Savvy isologo with brand dust; follows the pointer, turns with scroll.
  async logo({ THREE, scene, camera, theme, renderer }) {
    const { buildLogo, buildParticles } = await import('../shared/brand3d.js');
    const svg = await fetch('/brand/isologo-gradient.svg').then((r) => r.text());
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const logo = buildLogo(svg);
    logo.material.envMapIntensity = 1.4;
    const group = new THREE.Group();
    group.add(logo);
    scene.add(group);
    const dust = buildParticles(600);
    scene.add(dust);
    scene.add(new THREE.HemisphereLight('#ffffff', theme === 'dark' ? '#14173D' : '#cfe9f5', 1.6));
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(4, 5, 6);
    const rim = new THREE.PointLight(BRAND.cyan, 40, 30);
    rim.position.set(-4, -2, 3);
    scene.add(key, rim);
    camera.position.z = 9;
    return {
      update(t, _dt, { pointer, progress }) {
        group.rotation.y = Math.sin(t * 0.4) * 0.22 + pointer.x * 0.45 + (progress - 0.35) * Math.PI * 0.5;
        group.rotation.x = Math.cos(t * 0.3) * 0.08 - pointer.y * 0.3;
        group.position.y = Math.sin(t * 0.8) * 0.12;
        dust.material.uniforms.uTime.value = t;
        dust.rotation.y = t * 0.02;
      },
    };
  },

  // A flowing point-grid "terrain" — demand rising and falling. Good as a hero/section background.
  async field({ THREE, scene, camera, theme }) {
    const geo = new THREE.PlaneGeometry(26, 14, 180, 100);
    geo.rotateX(-Math.PI / 2.35);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2() },
        uProgress: { value: 0 },
        uA: { value: new THREE.Color(BRAND.primary) },
        uB: { value: new THREE.Color(theme === 'dark' ? '#7fd3f0' : BRAND.dark) },
        uPR: { value: Math.min(devicePixelRatio, 2) },
        uAlpha: { value: theme === 'dark' ? 0.95 : 0.7 },
      },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform vec2 uPointer; uniform float uProgress; uniform float uPR;
        varying float vH; varying float vD;
        void main(){
          vec3 p = position;
          float w = sin(p.x*0.45 + uTime*0.6)*0.55 + cos(p.z*0.6 - uTime*0.45)*0.4 + sin((p.x+p.z)*0.25 + uTime*0.3)*0.5;
          vec2 pp = vec2(uPointer.x*9.0, -uPointer.y*5.0);
          float d = distance(p.xz, pp);
          w += exp(-d*d*0.08) * 1.4;
          w *= 0.7 + uProgress*0.8;
          p.y += w;
          vH = w;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          vD = -mv.z;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.6 + w*0.9) * uPR * (14.0 / -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uA; uniform vec3 uB; uniform float uAlpha;
        varying float vH; varying float vD;
        void main(){
          float r = length(gl_PointCoord-0.5);
          if (r > 0.5) discard;
          float fog = smoothstep(26.0, 8.0, vD);
          gl_FragColor = vec4(mix(uB, uA, clamp(vH*0.5+0.5,0.0,1.0)), smoothstep(0.5,0.1,r) * fog * uAlpha);
        }`,
    });
    const pts = new THREE.Points(geo, mat);
    pts.position.y = -1.6;
    scene.add(pts);
    camera.position.set(0, 1.2, 11);
    return {
      update(t, _dt, { pointer, progress }) {
        mat.uniforms.uTime.value = t;
        mat.uniforms.uPointer.value.copy(pointer);
        mat.uniforms.uProgress.value = progress;
        camera.position.x = pointer.x * 0.6;
        camera.lookAt(0, -0.5, 0);
      },
    };
  },

  // Iridescent noise-displaced orb (brand gradient + fresnel). Works on light and dark.
  async orb({ THREE, scene, camera }) {
    const geo = new THREE.IcosahedronGeometry(2.2, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uA: { value: new THREE.Color(BRAND.navy) },
        uB: { value: new THREE.Color(BRAND.cyan) },
        uC: { value: new THREE.Color(BRAND.accent) },
      },
      vertexShader: /* glsl */ `
        uniform float uTime; uniform float uProgress;
        varying vec3 vN; varying vec3 vView; varying float vDisp;
        // compact 3D value noise
        float h(vec3 p){ return fract(sin(dot(p, vec3(17.1,113.7,71.3)))*43758.5453); }
        float n(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        void main(){
          float d = n(normal*1.6 + uTime*0.35) * (0.45 + uProgress*0.5);
          vDisp = d;
          vec3 p = position + normal * d;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          vN = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
        varying vec3 vN; varying vec3 vView; varying float vDisp;
        void main(){
          float fres = pow(1.0 - max(dot(vN, vView), 0.0), 2.2);
          vec3 col = mix(uA, uB, smoothstep(0.05, 0.55, vDisp));
          col = mix(col, uC, smoothstep(0.62, 0.9, vDisp) * 0.6);
          col += fres * vec3(0.55, 0.85, 1.0);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const orb = new THREE.Mesh(geo, mat);
    scene.add(orb);
    camera.position.z = 8;
    return {
      update(t, _dt, { pointer, progress }) {
        mat.uniforms.uTime.value = t;
        mat.uniforms.uProgress.value = progress;
        orb.rotation.y = t * 0.12 + pointer.x * 0.4;
        orb.rotation.x = -pointer.y * 0.3;
      },
    };
  },

  // A ring of 7 nodes (the Growth Loop) orbiting in 3D; progress lights nodes in order.
  async rings({ THREE, scene, camera, theme }) {
    const group = new THREE.Group();
    scene.add(group);
    const ringMat = new THREE.MeshBasicMaterial({ color: theme === 'dark' ? '#7fd3f0' : BRAND.primary, transparent: true, opacity: 0.35 });
    const torus = new THREE.Mesh(new THREE.TorusGeometry(3, 0.012, 8, 220), ringMat);
    group.add(torus);
    const torus2 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.006, 8, 220), ringMat.clone());
    torus2.material.opacity = 0.18;
    group.add(torus2);
    const nodes = [];
    const off = new THREE.Color(theme === 'dark' ? '#2b3a66' : '#c9dde6');
    const on = new THREE.Color(BRAND.primary);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.PI / 2;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 16), new THREE.MeshStandardMaterial({ color: off.clone(), emissive: new THREE.Color(BRAND.cyan), emissiveIntensity: 0, roughness: 0.3, metalness: 0.2 }));
      m.position.set(Math.cos(a) * 3, Math.sin(a) * 3, 0);
      group.add(m);
      nodes.push(m);
    }
    // A comet travelling the loop
    const comet = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8), new THREE.MeshBasicMaterial({ color: BRAND.accent }));
    group.add(comet);
    scene.add(new THREE.AmbientLight('#ffffff', 1.2));
    const l = new THREE.DirectionalLight('#ffffff', 2);
    l.position.set(3, 4, 6);
    scene.add(l);
    group.rotation.x = -0.5;
    camera.position.z = 11;
    return {
      update(t, _dt, { pointer, progress }) {
        group.rotation.z = -t * 0.08;
        group.rotation.x = -0.5 - pointer.y * 0.2;
        group.rotation.y = pointer.x * 0.3;
        const lit = progress * 7;
        nodes.forEach((m, i) => {
          const k = THREE.MathUtils.clamp(lit - i, 0, 1);
          m.material.color.copy(off).lerp(on, k);
          m.material.emissiveIntensity = k * 0.6;
          m.scale.setScalar(1 + k * 0.35 + Math.sin(t * 2 + i) * 0.04);
        });
        const a = t * 0.6 + Math.PI / 2;
        comet.position.set(Math.cos(a) * 3, Math.sin(a) * 3, 0);
      },
    };
  },

  // Soft flowing ribbons (tube splines) — elegant background for dark CTA / footer bands.
  async ribbons({ THREE, scene, camera, theme }) {
    const cols = [BRAND.primary, BRAND.dark, BRAND.cyan, theme === 'dark' ? '#ffffff' : BRAND.navy];
    const ribbons = cols.map((c, i) => {
      const pts = Array.from({ length: 8 }, (_, k) => new THREE.Vector3(-9 + k * 2.6, Math.sin(k * 0.9 + i) * 1.2, Math.cos(k * 0.7 + i) * 1.5 - i * 0.6));
      const curve = new THREE.CatmullRomCurve3(pts);
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 200, 0.05 + i * 0.012, 12, false),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: theme === 'dark' ? 0.55 : 0.35 }),
      );
      mesh.userData = { pts, curve, i };
      scene.add(mesh);
      return mesh;
    });
    camera.position.z = 12;
    return {
      update(t, _dt, { pointer, progress }) {
        ribbons.forEach((m) => {
          const { pts, curve, i } = m.userData;
          pts.forEach((p, k) => {
            p.y = Math.sin(k * 0.9 + i + t * 0.5) * (1.2 + progress) + pointer.y * 0.6 * (k / 8);
            p.z = Math.cos(k * 0.7 + i + t * 0.35) * 1.5 - i * 0.6;
          });
          m.geometry.dispose();
          m.geometry = new THREE.TubeGeometry(curve, 160, 0.05 + i * 0.012, 10, false);
        });
        camera.position.x = pointer.x * 0.8;
      },
    };
  },
};
