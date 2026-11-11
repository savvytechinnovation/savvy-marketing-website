// Growth System — "the loop" as a 3D journey: seven stations on a ring, the camera travels
// from station to station with the pinned scroll (setProgress) or on demand (goTo).
//  01 Strategy: target rings + compass needle    02 Build: stacked blocks
//  03 Generate: particle fountain                 04 Convert: funnel with a spiral
//  05 Measure: ascending bars                     06 Optimize: torus knot
//  07 Grow: rising helix + arrow
// three.js is imported lazily; pauses off-screen / hidden tab; reduced motion renders still frames.
import { gsap } from '../../ds/site.js';

const C = { bg: '#070b1f', cyan: '#0396C7', primary: '#0792C2', dark: '#293BAA', ice: '#8fe6ff', accent: '#FF5527', navy: '#14173D' };

export async function mountJourney(el, { reduce = false } = {}) {
  if (!el) return null;
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return null;
  } catch {
    return null;
  }
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const mobile = matchMedia('(max-width: 767px)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(C.bg, 1);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'journey__canvas';
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
  el.append(canvas);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.bg, 16, 40);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);

  scene.add(new THREE.HemisphereLight('#bfe9ff', C.navy, 0.9));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(6, 12, 8);
  scene.add(key);
  const spot = new THREE.PointLight(C.cyan, 60, 14, 1.6);
  scene.add(spot);
  const warm = new THREE.PointLight(C.accent, 25, 9, 1.8);
  scene.add(warm);

  const R = 9;
  const N = 7;
  const angleOf = (i) => (i / N) * Math.PI * 2 + Math.PI / 2;
  const posOf = (i, r = R) => new THREE.Vector3(Math.cos(angleOf(i)) * r, 0, Math.sin(angleOf(i)) * r);

  // ---- ground: polar grid, path ring, dust
  const grid = new THREE.PolarGridHelper(16, 14, 10, 96, C.dark, C.dark);
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  grid.position.y = -0.08;
  scene.add(grid);
  const pathMat = new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.55 });
  const path = new THREE.Mesh(new THREE.TorusGeometry(R, 0.025, 8, 260), pathMat);
  path.rotation.x = Math.PI / 2;
  scene.add(path);
  const progressArc = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 8, 260, 0.001), new THREE.MeshBasicMaterial({ color: C.accent }));
  progressArc.rotation.x = Math.PI / 2;
  scene.add(progressArc);
  const comet = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  scene.add(comet);

  const dustN = mobile ? 700 : 1800;
  const dustGeo = new THREE.BufferGeometry();
  const dp = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) dp.set([(Math.random() - 0.5) * 50, Math.random() * 14 - 1, (Math.random() - 0.5) * 50], i * 3);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: C.ice, size: 0.05, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(dust);

  // ---- materials
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.3, ...extra });
  const glow = (color, opacity = 0.9) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity });

  // ---- stations
  const stations = [];
  const updaters = [];
  for (let i = 0; i < N; i++) {
    const g = new THREE.Group();
    g.position.copy(posOf(i));
    scene.add(g);
    g.lookAt(posOf(i, R * 2));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.16, 6), std('#10163a', { metalness: 0.6, roughness: 0.25 }));
    pad.position.y = 0.08;
    g.add(pad);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.025, 6, 6), glow(C.cyan, 0.8));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.17;
    g.add(rim);
    const content = new THREE.Group();
    content.position.y = 0.2;
    g.add(content);
    stations.push({ g, rim, content, k: 0 });
  }

  // 01 Strategy — target
  {
    const c = stations[0].content;
    const t = new THREE.Group();
    t.position.y = 1.5;
    [1.1, 0.75, 0.4].forEach((r, k) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 12, 64), std(k === 2 ? C.accent : C.primary, { emissive: k === 2 ? C.accent : C.cyan, emissiveIntensity: 0.35 }));
      t.add(m);
    });
    const bull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), std(C.accent, { emissive: C.accent, emissiveIntensity: 0.8 }));
    t.add(bull);
    c.add(t);
    const needle = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.2, 12), std('#ffffff', { emissive: C.ice, emissiveIntensity: 0.4 }));
    needle.rotation.x = Math.PI / 2;
    const nh = new THREE.Group();
    nh.position.set(0, 1.5, 0.9);
    nh.add(needle);
    c.add(nh);
    updaters[0] = (t0) => {
      t.rotation.y = Math.sin(t0 * 0.6) * 0.35;
      nh.rotation.z = t0 * 0.8;
      nh.position.z = 0.9 + Math.sin(t0 * 2) * 0.12;
    };
  }
  // 02 Build — stacked blocks
  {
    const c = stations[1].content;
    const blocks = [];
    const H = [3, 2, 4, 1, 3, 2, 2, 4, 3];
    const edgeMat = new THREE.LineBasicMaterial({ color: C.ice, transparent: true, opacity: 0.8 });
    const box = new THREE.BoxGeometry(0.46, 0.46, 0.46);
    const edges = new THREE.EdgesGeometry(box);
    H.forEach((h, k) => {
      for (let y = 0; y < h; y++) {
        const m = new THREE.Mesh(box, std(y === h - 1 ? C.primary : C.dark, { transparent: true, opacity: 0.85 }));
        m.add(new THREE.LineSegments(edges, edgeMat));
        m.position.set(((k % 3) - 1) * 0.5, 0.25 + y * 0.5, (Math.floor(k / 3) - 1) * 0.5);
        m.userData = { y0: m.position.y, d: (k + y) * 0.07 };
        c.add(m);
        blocks.push(m);
      }
    });
    updaters[1] = (t0, k) => {
      blocks.forEach((b) => {
        const v = THREE.MathUtils.clamp(k * 1.6 - b.userData.d, 0, 1);
        b.position.y = b.userData.y0 + (1 - v) * 3;
        b.scale.setScalar(Math.max(0.001, v));
      });
    };
  }
  // 03 Generate — fountain
  {
    const c = stations[2].content;
    const n = mobile ? 300 : 700;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const seeds = Array.from({ length: n }, () => ({ a: Math.random() * Math.PI * 2, s: 0.6 + Math.random() * 0.8, o: Math.random() }));
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: C.ice, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    c.add(pts);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), std(C.accent, { emissive: C.accent, emissiveIntensity: 0.7, flatShading: true }));
    core.position.y = 0.4;
    c.add(core);
    updaters[2] = (t0) => {
      for (let k = 0; k < n; k++) {
        const s = seeds[k];
        const life = (t0 * 0.45 * s.s + s.o) % 1;
        const r = life * 1.3;
        pos[k * 3] = Math.cos(s.a) * r;
        pos[k * 3 + 1] = 0.4 + life * 3.2 - life * life * 2.4;
        pos[k * 3 + 2] = Math.sin(s.a) * r;
      }
      geo.attributes.position.needsUpdate = true;
      core.rotation.set(t0 * 0.7, t0 * 0.9, 0);
    };
  }
  // 04 Convert — funnel + spiral
  {
    const c = stations[3].content;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.4, 40, 8, true), new THREE.MeshBasicMaterial({ color: C.cyan, wireframe: true, transparent: true, opacity: 0.35 }));
    cone.rotation.x = Math.PI;
    cone.position.y = 1.5;
    c.add(cone);
    const n = 160;
    const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: C.ice }), n);
    c.add(balls);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), std(C.accent, { emissive: C.accent, emissiveIntensity: 0.8 }));
    c.add(drop);
    const m4 = new THREE.Matrix4();
    updaters[3] = (t0) => {
      for (let k = 0; k < n; k++) {
        const v = (k / n + t0 * 0.12) % 1;
        const r = 1.2 * (1 - v) + 0.05;
        const a = v * 18 + k;
        m4.makeTranslation(Math.cos(a) * r, 2.7 - v * 2.4, Math.sin(a) * r);
        balls.setMatrixAt(k, m4);
      }
      balls.instanceMatrix.needsUpdate = true;
      drop.position.y = 0.35 + Math.abs(Math.sin(t0 * 2.2)) * 0.12;
      cone.rotation.y = t0 * 0.3;
    };
  }
  // 05 Measure — bars
  {
    const c = stations[4].content;
    const bars = [0.6, 1.0, 1.35, 1.8, 2.4].map((h, k) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.34), std(k === 4 ? C.accent : k % 2 ? C.primary : C.dark, { emissive: k === 4 ? C.accent : C.cyan, emissiveIntensity: k === 4 ? 0.5 : 0.15 }));
      m.position.x = (k - 2) * 0.48;
      m.userData.h = h;
      c.add(m);
      return m;
    });
    const line = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.012, 6, 64, Math.PI), glow(C.ice, 0.6));
    line.position.y = 0.2;
    c.add(line);
    updaters[4] = (t0, k) => {
      bars.forEach((b, j) => {
        const v = THREE.MathUtils.clamp(k * 1.8 - j * 0.12, 0.05, 1);
        const h = b.userData.h * v * (1 + Math.sin(t0 * 2 + j) * 0.03);
        b.scale.y = h;
        b.position.y = h / 2;
      });
    };
  }
  // 06 Optimize — torus knot + orbit
  {
    const c = stations[5].content;
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.62, 0.17, 180, 18, 2, 3), std(C.primary, { metalness: 0.8, roughness: 0.15, emissive: C.dark, emissiveIntensity: 0.3 }));
    knot.position.y = 1.5;
    c.add(knot);
    const orbit = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), std(C.accent, { emissive: C.accent, emissiveIntensity: 0.9 }));
    c.add(orbit);
    updaters[5] = (t0) => {
      knot.rotation.set(t0 * 0.4, t0 * 0.6, 0);
      orbit.position.set(Math.cos(t0 * 1.6) * 1.2, 1.5 + Math.sin(t0 * 3.2) * 0.3, Math.sin(t0 * 1.6) * 1.2);
    };
  }
  // 07 Grow — helix + arrow
  {
    const c = stations[6].content;
    const n = 26;
    const balls = [];
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.07 + k * 0.004, 14, 10), std(k > n - 5 ? C.accent : C.cyan, { emissive: k > n - 5 ? C.accent : C.cyan, emissiveIntensity: 0.4 }));
      c.add(m);
      balls.push(m);
    }
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 20), std(C.accent, { emissive: C.accent, emissiveIntensity: 0.7 }));
    c.add(arrow);
    updaters[6] = (t0, k) => {
      const grow = THREE.MathUtils.clamp(k * 1.5, 0.15, 1);
      balls.forEach((b, j) => {
        const v = j / n;
        const a = v * Math.PI * 5 + t0 * 0.8;
        const r = 0.35 + v * 0.7;
        b.position.set(Math.cos(a) * r, v * 3.2 * grow + 0.2, Math.sin(a) * r);
        b.visible = v <= grow + 0.02;
      });
      arrow.position.y = 3.2 * grow + 0.6;
    };
  }

  // ---- camera journey
  const state = { s: 0, target: 0 };
  const pointer = new THREE.Vector2(), pointerT = new THREE.Vector2();
  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    pointerT.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  if (!reduce) addEventListener('pointermove', onMove, { passive: true });

  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  const resize = () => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  let t = 0, last = performance.now(), lastPa = -1;
  const frame = (dt) => {
    if (!reduce) t += dt;
    state.s += (state.target - state.s) * (reduce ? 1 : 1 - Math.pow(0.002, dt));
    const s = state.s;
    const a = (s / N) * Math.PI * 2 + Math.PI / 2;
    const narrow = camera.aspect < 1;
    const dist = R + (narrow ? 10 : 9.5);
    camPos.set(Math.cos(a) * dist, narrow ? 4.6 : 4.4, Math.sin(a) * dist);
    // swing slightly sideways so the copy on the left never covers the station
    tmp.set(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(narrow ? 0 : -3);
    camPos.add(tmp);
    pointer.lerp(pointerT, 0.05);
    camPos.y += pointer.y * 0.5;
    camPos.addScaledVector(tmp.set(-Math.sin(a), 0, Math.cos(a)), pointer.x * 0.8);
    camera.position.copy(camPos);
    look.set(Math.cos(a) * R * 0.8, 1.1, Math.sin(a) * R * 0.8);
    camera.lookAt(look);

    // lights follow the active station
    const near = Math.round(THREE.MathUtils.clamp(s, 0, N - 1));
    spot.position.copy(posOf(near)).add(tmp.set(0, 4, 0));
    warm.position.copy(posOf(near, R + 2)).setY(1.2);
    stations.forEach((st, i) => {
      const d = Math.abs(s - i);
      const k = THREE.MathUtils.clamp(1 - d, 0, 1);
      st.k += (k - st.k) * 0.1;
      st.g.scale.setScalar(0.78 + st.k * 0.22);
      st.rim.material.color.set(k > 0.5 ? C.accent : C.cyan);
      st.rim.material.opacity = 0.35 + st.k * 0.6;
      if (d < 2.2 || reduce) updaters[i]?.(t, reduce ? 1 : st.k);
    });
    // comet + progress arc on the path
    const pa = THREE.MathUtils.clamp((s + 0.5) / N, 0.0005, 1) * Math.PI * 2;
    if (Math.abs(pa - lastPa) > 0.003) {
      lastPa = pa;
      progressArc.geometry.dispose();
      progressArc.geometry = new THREE.TorusGeometry(R, 0.06, 6, 200, pa);
      progressArc.rotation.set(Math.PI / 2, 0, Math.PI / 2 - Math.PI / N);
    }
    const ca = t * 0.5;
    comet.position.set(Math.cos(ca) * R, 0.05, Math.sin(ca) * R);
    dust.rotation.y = t * 0.01;
    renderer.render(scene, camera);
  };

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(el);
  const tick = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    frame(dt);
  };
  let raf = 0;
  const still = () => (raf ||= requestAnimationFrame(() => ((raf = 0), frame(0.016))));
  if (reduce) {
    ro.disconnect();
    new ResizeObserver(() => (resize(), still())).observe(el);
    still();
  } else gsap.ticker.add(tick);
  gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.2 });

  return {
    /** p in 0..1 across the whole pinned range; station i is centred at (i + 0.5) / 7 */
    setProgress(p) {
      state.target = THREE.MathUtils.clamp(p * N - 0.5, 0, N - 1);
      if (reduce) still();
    },
    goTo(i) {
      state.target = i;
      if (reduce) still();
    },
    destroy() {
      gsap.ticker.remove(tick);
      removeEventListener('pointermove', onMove);
      ro.disconnect();
      io.disconnect();
      scene.traverse((o) => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach((m) => m.dispose());
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}
