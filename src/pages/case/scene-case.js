// Round 2 · Case pages: two WebGL scenes built from the case's own chart data (src/content/cases.js).
//
//   mountCaseHero(el, { series, color })      cinematic intro: the camera drops from a top-down plan view into a
//                                             3/4 view of a before/after "skyline", a growth line draws itself,
//                                             data motes rise; then a slow orbit + pointer parallax.
//   mountTheatre(el, { series, color })       → { setProgress(p) }: scroll-driven before → after chart. Solid bars
//                                             morph from the "before" heights to the "after" heights while ghost
//                                             outlines keep the "before" shape; the camera swings as you scroll.
//
// series = [[...before], [...after]] (the chart's two series). Placeholder data is labelled on the page.
import { glStage, damp, raw, rng } from '../results/gl-kit.js';

const BAR_VS = /* glsl */ `
  attribute float aRow; attribute float aIdx;
  varying vec3 vN; varying float vY; varying float vRow; varying vec3 vW; varying float vIdx;
  void main(){ vN = normal; vY = position.y; vRow = aRow; vIdx = aIdx;
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const BAR_FS = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uColor2; uniform float uTime; uniform float uMix; uniform float uN;
  varying vec3 vN; varying float vY; varying float vRow; varying vec3 vW; varying float vIdx;
  void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW);
    float lam = 0.45 + 0.55 * max(dot(n, normalize(vec3(0.4, 1.0, 0.6))), 0.0);
    float fr = pow(1.0 - max(dot(n, v), 0.0), 2.0);
    vec3 after = mix(uColor, uColor2, vIdx / max(1.0, uN - 1.0));
    vec3 before = vec3(0.42, 0.48, 0.62);
    vec3 base = mix(before, after, clamp(vRow * uMix, 0.0, 1.0));
    float scan = smoothstep(0.05, 0.0, abs(fract(vW.y * 0.8 - uTime * 0.4) - 0.5) - 0.45) * 0.3 * vRow;
    vec3 c = base * lam * (0.6 + 0.4 * vY) + fr * base * 0.5 + step(0.5, n.y) * 0.18 + scan;
    gl_FragColor = vec4(c, 1.0); }`;

function normalise(series) {
  const s = series?.length ? series : [[3, 4, 3, 5, 4, 5], [4, 6, 7, 8, 9, 11]];
  const before = s[0];
  const after = s[s.length - 1];
  const max = Math.max(...before, ...after) || 1;
  return { before: before.map((v) => v / max), after: after.map((v) => v / max), n: Math.max(before.length, after.length) };
}

function gridFloor(THREE, size = 30, cell = 0.5) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uCell: { value: cell } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `uniform float uCell; varying vec3 vW;
      void main(){ vec2 q = vW.xz / uCell; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); float l = 1.0 - min(min(g.x, g.y), 1.0);
        vec2 Q = vW.xz / (uCell * 4.0); vec2 G = abs(fract(Q - 0.5) - 0.5) / fwidth(Q); float L = 1.0 - min(min(G.x, G.y), 1.0);
        float fade = smoothstep(11.0, 3.0, length(vW.xz));
        gl_FragColor = vec4(vec3(0.3, 0.5, 1.0) * (l * 0.5 + L), (l * 0.25 + L * 0.45) * fade); }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), mat);
  m.position.y = -0.005;
  return m;
}

function buildBars(ctx, data, { color, rows = 2, gap = 0.9, depth = 1.1, H = 4.2 }) {
  const { THREE } = ctx;
  const n = data.n;
  const geo = new THREE.BoxGeometry(0.56, 1, 0.56);
  geo.translate(0, 0.5, 0);
  const count = n * rows;
  const aRow = new Float32Array(count);
  const aIdx = new Float32Array(count);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: raw(THREE, color) }, uColor2: { value: raw(THREE, '#293baa') }, uTime: { value: 0 }, uMix: { value: 1 }, uN: { value: n } },
    vertexShader: BAR_VS,
    fragmentShader: BAR_FS,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  let k = 0;
  for (let r = 0; r < rows; r++)
    for (let i = 0; i < n; i++) {
      aRow[k] = rows === 1 ? 1 : r;
      aIdx[k] = i;
      k++;
    }
  geo.setAttribute('aRow', new THREE.InstancedBufferAttribute(aRow, 1));
  geo.setAttribute('aIdx', new THREE.InstancedBufferAttribute(aIdx, 1));
  const xOf = (i) => (i - (n - 1) / 2) * gap;
  const zOf = (r) => (rows === 1 ? 0 : (r - (rows - 1) / 2) * depth);
  const m4 = new THREE.Matrix4();
  const set = (heights, grow = 1) => {
    let j = 0;
    for (let r = 0; r < rows; r++)
      for (let i = 0; i < n; i++) {
        const h = Math.max(0.02, heights[r][i] * H * grow);
        m4.makeScale(1, h, 1).setPosition(xOf(i), 0, zOf(r));
        mesh.setMatrixAt(j++, m4);
      }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { mesh, mat, set, xOf, zOf, H };
}

// ---------------------------------------------------------------------------------------------------------------------
export function mountCaseHero(el, { series, color = '#0792c2' }) {
  return glStage(
    el,
    (ctx) => {
      const { THREE, scene, camera, small } = ctx;
      const data = normalise(series);
      const root = new THREE.Group();
      scene.add(root);
      root.add(gridFloor(THREE));
      const bars = buildBars(ctx, data, { color, H: 3 });
      root.add(bars.mesh);
      // growth line over the "after" row
      const pts = data.after.map((v, i) => new THREE.Vector3(bars.xOf(i), v * bars.H + 0.35, bars.zOf(1)));
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.035, 8, false), new THREE.MeshBasicMaterial({ color: '#ff5527' }));
      const tubeCount = tube.geometry.index.count;
      tube.geometry.setDrawRange(0, ctx.reduce ? tubeCount : 0);
      root.add(tube);
      // data motes rising from the after bars
      const N = small ? 300 : 800;
      const seeds = new Float32Array(N * 3);
      const r = rng(17);
      for (let i = 0; i < N; i++) seeds.set([r(), r(), r()], i * 3);
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      pg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
      const pMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSpan: { value: (data.n - 1) * 0.9 + 1.5 }, uPR: { value: Math.min(devicePixelRatio || 1, 2) } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `attribute vec3 aSeed; uniform float uTime; uniform float uSpan; uniform float uPR; varying float vA;
          void main(){ float s = fract(aSeed.y + uTime * (0.04 + aSeed.z * 0.06));
            vec3 p = vec3((aSeed.x - 0.5) * uSpan, s * 6.0, (aSeed.z - 0.5) * 4.0);
            vA = sin(s * 3.1416) * 0.7; vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (1.5 + aSeed.z * 3.0) * uPR * (8.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float a = smoothstep(0.5, 0.0, d) * vA; gl_FragColor = vec4(vec3(0.5, 0.8, 1.0) * a, a); }`,
      });
      const motes = new THREE.Points(pg, pMat);
      motes.frustumCulled = false;
      root.add(motes);

      let intro = ctx.reduce ? 1 : 0;
      let wide = true;
      const from = new THREE.Vector3(0.01, 16, 0.5);
      const cam = new THREE.Vector3();
      return {
        resize(w, h) {
          wide = w / h > 1.2;
        },
        update(t, dt, c) {
          intro = ctx.reduce ? 1 : Math.min(1, intro + dt * 0.42);
          const e = 1 - Math.pow(1 - intro, 4);
          const grow = Math.min(1, Math.max(0, intro * 1.4 - 0.15));
          bars.set([data.before, data.after], 1 - Math.pow(1 - grow, 3));
          bars.mat.uniforms.uTime.value = t;
          pMat.uniforms.uTime.value = t;
          tube.geometry.setDrawRange(0, Math.floor(Math.min(1, Math.max(0, intro * 1.6 - 0.6)) * tubeCount / 3) * 3);
          const orbit = ctx.reduce ? 0.6 : 0.6 + Math.sin(t * 0.12) * 0.25;
          const R = wide ? 15 : 17;
          const to = new THREE.Vector3(Math.sin(orbit) * R, wide ? 5.4 : 8, Math.cos(orbit) * R);
          cam.copy(from).lerp(to, e);
          cam.x += c.pointer.x * 0.7 * e;
          cam.y += c.pointer.y * 0.4 * e;
          camera.position.copy(cam);
          root.position.set(wide ? 5.4 : 0, wide ? -0.2 : 2.2, 0);
          camera.lookAt(wide ? 1.0 : 0, 1.0, 0);
        },
      };
    },
    { fov: 34, className: 'gl-case-hero', rootMargin: '0px' },
  );
}

// ---------------------------------------------------------------------------------------------------------------------
export function mountTheatre(el, { series, color = '#0792c2' }) {
  let progress = 0;
  const stage = glStage(
    el,
    (ctx) => {
      const { THREE, scene, camera } = ctx;
      const data = normalise(series);
      const root = new THREE.Group();
      scene.add(root);
      root.add(gridFloor(THREE, 30, 0.45));
      const bars = buildBars(ctx, data, { color, rows: 1, gap: 1.05, H: 4.4 });
      root.add(bars.mesh);
      // ghost outlines at the "before" heights
      const ghosts = data.before.map((v, i) => {
        const g = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.66, Math.max(0.02, v * bars.H), 0.66)), new THREE.LineBasicMaterial({ color: '#c7d2fe', transparent: true, opacity: 0.55 }));
        g.position.set(bars.xOf(i), (v * bars.H) / 2, 0);
        root.add(g);
        return g;
      });
      // delta markers: small cones above bars that grew
      const cones = data.after.map((v, i) => {
        const up = v >= data.before[i];
        const m = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.24, 16), new THREE.MeshBasicMaterial({ color: up ? '#22c55e' : '#ff5527', transparent: true, opacity: 0 }));
        if (!up) m.rotation.z = Math.PI;
        root.add(m);
        return m;
      });
      let p = ctx.reduce ? 1 : 0;
      let wide = true;
      return {
        resize(w, h) {
          wide = w / h > 1.2;
        },
        update(t, dt, c) {
          p = ctx.reduce ? progress : damp(p, progress, 8, dt);
          const e = p * p * (3 - 2 * p);
          const hs = data.before.map((b, i) => b + (data.after[i] - b) * e);
          bars.set([hs]);
          bars.mat.uniforms.uMix.value = e;
          bars.mat.uniforms.uTime.value = t;
          cones.forEach((m, i) => {
            m.position.set(bars.xOf(i), hs[i] * bars.H + 0.4 + Math.sin(t * 3 + i) * 0.06, 0);
            m.material.opacity = Math.max(0, e * 1.4 - 0.4);
          });
          ghosts.forEach((g) => (g.material.opacity = 0.25 + 0.4 * e));
          const span = (data.n - 1) * 1.05;
          const R = (wide ? 7.5 : 11) + span * 0.55;
          const ang = -0.55 + e * 1.0 + c.pointer.x * 0.08;
          camera.position.set(Math.sin(ang) * R, 3.4 + e * 1.6 + c.pointer.y * 0.3, Math.cos(ang) * R);
          camera.lookAt(0, 1.6, 0);
        },
      };
    },
    { fov: 32, className: 'gl-theatre' },
  );
  return stage.then((s) => (s ? { setProgress: (v) => ((progress = v), s.invalidate()), destroy: () => s.destroy() } : null));
}

