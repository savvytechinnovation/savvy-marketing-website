// Page-specific Three.js scene: a 3D "before → after" growth bar chart.
// Used behind the Results hub hero (generic rising bars) and in each case-study hero (built from the case's chart data).
//
//   mountGrowth3D(el, { series: [[…before], […after]], scrub: true, theme: 'light' | 'dark' })
//
// Same rules as src/ds/fx3d.js: three is imported lazily when the box nears the viewport, rendering pauses off-screen
// or when the tab is hidden, DPR ≤ 2, prefers-reduced-motion renders one finished still frame, destroy() disposes all.
import { gsap, ScrollTrigger, reduceMotion } from '../../ds/site.js';

const COLORS = { before: '#cbd5e1', afterA: '#0792c2', afterB: '#293baa', floor: '#e2e8f0', floorDark: '#293baa' };

export function mountGrowth3D(el, opts = {}) {
  if (!el) return Promise.resolve(null);
  return new Promise((resolve) => {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        start(el, opts).then(resolve, (err) => {
          console.warn('[growth3d]', err);
          resolve(null);
        });
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(el);
  });
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function start(el, { series, scrub = false, theme = 'light', intro = true } = {}) {
  if (!hasWebGL()) return null;
  const THREE = await import('three');
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

  const small = innerWidth < 768;
  const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.className = 'fx3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', pointerEvents: 'none', opacity: '0' });
  el.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // ---- data → bars -------------------------------------------------------
  const data = series?.length ? series : defaultSeries();
  const cols = Math.max(...data.map((s) => s.length));
  const max = Math.max(...data.flat());
  const gap = 0.62;
  const depthGap = 0.9;
  const width = (cols - 1) * gap;
  const geo = new THREE.BoxGeometry(0.42, 1, 0.42);
  geo.translate(0, 0.5, 0); // grow from the floor
  const group = new THREE.Group();
  scene.add(group);

  const bars = [];
  const after = new THREE.Color(COLORS.afterA);
  const afterB = new THREE.Color(COLORS.afterB);
  data.forEach((row, r) => {
    const isAfter = r === data.length - 1 && data.length > 1;
    row.forEach((v, i) => {
      const color = isAfter ? after.clone().lerp(afterB, i / Math.max(1, cols - 1)) : new THREE.Color(theme === 'dark' ? '#64748b' : COLORS.before);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1, transparent: true, opacity: isAfter ? 1 : 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(i * gap - width / 2, 0, (r - (data.length - 1) / 2) * depthGap);
      mesh.userData = { h: (v / max) * 3.2 + 0.05, i, r };
      mesh.scale.y = 0.001;
      group.add(mesh);
      bars.push(mesh);
    });
  });

  // floor grid
  const grid = new THREE.GridHelper(Math.max(width + 3, 8), 16, theme === 'dark' ? COLORS.floorDark : COLORS.floor, theme === 'dark' ? COLORS.floorDark : COLORS.floor);
  grid.material.transparent = true;
  grid.material.opacity = theme === 'dark' ? 0.5 : 0.8;
  group.add(grid);

  // trend line over the "after" row
  const lastRow = bars.filter((b) => b.userData.r === data.length - 1);
  const linePts = lastRow.map((b) => new THREE.Vector3(b.position.x, b.userData.h + 0.25, b.position.z));
  const curve = new THREE.CatmullRomCurve3(linePts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.035, 8, false), new THREE.MeshBasicMaterial({ color: '#ff5527' }));
  tube.geometry.setDrawRange(0, 0);
  group.add(tube);
  const tubeCount = tube.geometry.index.count;

  scene.add(new THREE.HemisphereLight('#ffffff', theme === 'dark' ? '#14173d' : '#dbeafe', 1.5));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(4, 8, 6);
  const rim = new THREE.PointLight('#0396c7', 30, 30);
  rim.position.set(-5, 3, -3);
  scene.add(key, rim);

  group.rotation.y = -0.55;
  camera.position.set(0, 3.4, 11);
  camera.lookAt(0, 1.1, 0);

  // ---- size --------------------------------------------------------------
  const resize = () => {
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole chart in frame on narrow boxes
    camera.position.z = Math.max(11, ((width + 3) / Math.min(1.6, camera.aspect)) * 1.7);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  // ---- growth state (0 → 1), driven by an intro tween and/or scroll -----
  const state = { grow: reduceMotion ? 1 : 0, scroll: 0 };
  const apply = () => {
    const g = state.grow;
    bars.forEach((b) => {
      const { h, i, r } = b.userData;
      const local = gsap.utils.clamp(0, 1, g * 1.6 - (i / cols) * 0.6 - r * 0.08);
      b.scale.y = Math.max(0.001, h * gsap.parseEase('power3.out')(local));
    });
    tube.geometry.setDrawRange(0, Math.floor(tubeCount * gsap.utils.clamp(0, 1, g * 1.3 - 0.3)));
  };

  let st, introTween;
  if (!reduceMotion) {
    if (scrub) {
      st = ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        end: 'bottom 25%',
        scrub: 0.6,
        onUpdate: (s) => {
          state.scroll = s.progress;
          state.grow = Math.max(state.grow, Math.min(1, s.progress * 1.4 + (intro ? 0.35 : 0)));
        },
      });
    }
    if (intro) introTween = gsap.to(state, { grow: scrub ? 0.55 : 1, duration: 2.2, ease: 'power2.out', delay: 0.3 });
  }

  // ---- pointer -----------------------------------------------------------
  const pointer = new THREE.Vector2();
  const target = new THREE.Vector2();
  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    target.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  };
  if (!reduceMotion) addEventListener('pointermove', onMove, { passive: true });

  // ---- loop (only while visible) ----------------------------------------
  let visible = true;
  const vis = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  vis.observe(el);
  let t = 0;
  const render = () => renderer.render(scene, camera);
  const tick = (_time, dt) => {
    if (!visible || document.hidden) return;
    t += dt / 1000;
    pointer.lerp(target.clampLength(0, 1.4), 0.05);
    apply();
    group.rotation.y = -0.55 + pointer.x * 0.25 + Math.sin(t * 0.25) * 0.06 + state.scroll * 0.35;
    group.rotation.x = -pointer.y * 0.06;
    lastRow.forEach((b, k) => (b.position.y = Math.sin(t * 1.4 + k * 0.5) * 0.03 * state.grow));
    render();
  };
  if (reduceMotion) {
    apply();
    render();
    canvas.style.opacity = '1';
  } else {
    gsap.ticker.add(tick);
    requestAnimationFrame(() => gsap.to(canvas, { opacity: 1, duration: 1, ease: 'power2.out' }));
  }

  return {
    replay() {
      if (reduceMotion) return;
      introTween?.kill();
      state.grow = 0;
      introTween = gsap.to(state, { grow: 1, duration: 1.6, ease: 'power2.out' });
    },
    destroy() {
      gsap.ticker.remove(tick);
      removeEventListener('pointermove', onMove);
      ro.disconnect();
      vis.disconnect();
      st?.kill();
      introTween?.kill();
      scene.traverse((o) => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach((m) => m.dispose());
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}

function defaultSeries() {
  const n = innerWidth < 768 ? 8 : 12;
  const before = Array.from({ length: n }, (_, i) => 30 + Math.sin(i * 0.9) * 6 + i * 0.6);
  const afterRow = before.map((v, i) => v + 4 + i * 3.2 + Math.sin(i * 1.3) * 3);
  return [before, afterRow];
}
