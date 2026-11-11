// Round 2 · Industries: the demand calendar as a 3D bar landscape (12 months × demand series).
//
//   mountCal3D(el, { values: number[][], onHover(m), onPick(m) }) → Promise<{ setMonth(m), setFocus(k|null), setSweep(p), destroy() } | null>
//
// Months are scrubbed by the page (pinned scroll on desktop), by pointer over the canvas, or by the month buttons
// (keyboard). The SVG chart + sr-only table in the markup stay as the accessible / no-WebGL version.
import { glStage, damp, raw } from '../results/gl-kit.js';

const SERIES = ['#3b52d9', '#0792c2', '#ff5527']; // = legend swatches (primary-dark brightened for the dark stage, primary, accent)
const CS = ''; // colours below are authored in display (sRGB) values and written straight out

export function mountCal3D(el, { values, onHover, onPick }) {
  let api = null;
  const stage = glStage(
    el,
    (ctx) => {
      const { THREE, scene, camera, canvas } = ctx;
      const S = values.length;
      const M = 12;
      const GAP = 1;
      const DZ = 1.05;
      const count = S * M;
      const geo = new THREE.BoxGeometry(0.62, 1, 0.7);
      geo.translate(0, 0.5, 0);
      const aMonth = new Float32Array(count);
      const aSeries = new Float32Array(count);
      const aH = new Float32Array(count);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMonth: { value: -1 },
          uFocus: { value: -1 },
          uGrow: { value: ctx.reduce ? 1 : 0 },
          uC0: { value: raw(THREE, SERIES[0]) },
          uC1: { value: raw(THREE, SERIES[1]) },
          uC2: { value: raw(THREE, SERIES[2]) },
        },
        vertexShader: /* glsl */ `
          attribute float aMonth; attribute float aSeries; attribute float aH;
          uniform float uTime; uniform float uMonth; uniform float uGrow;
          varying float vY; varying float vS; varying float vAct; varying vec3 vN; varying float vTop; varying float vM;
          void main(){
            float grow = clamp(uGrow * 1.6 - aMonth * 0.05, 0.0, 1.0); grow = 1.0 - pow(1.0 - grow, 3.0);
            float act = 1.0 - smoothstep(0.0, 1.2, abs(aMonth - uMonth));
            float h = max(0.04, aH * grow) * (1.0 + act * 0.12);
            vec3 p = position; p.y *= h; vY = position.y; vTop = h; vS = aSeries; vAct = act; vM = aMonth;
            vN = normal;
            gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform float uFocus; uniform float uMonth; uniform float uTime;
          varying float vY; varying float vS; varying float vAct; varying vec3 vN; varying float vTop; varying float vM;
          void main(){
            vec3 base = vS < 0.5 ? uC0 : (vS < 1.5 ? uC1 : uC2);
            float lam = 0.45 + 0.55 * max(dot(normalize(vN), normalize(vec3(0.4, 1.0, 0.7))), 0.0);
            float top = step(0.5, vN.y);
            vec3 c = base * lam * (0.55 + 0.45 * vY) + top * 0.18;
            float scan = smoothstep(0.03, 0.0, abs(fract(vY * vTop * 2.0 - uTime * 0.6) - 0.5) - 0.47) * 0.25;
            c += vAct * (0.12 + scan) + vAct * top * 0.25;
            float dim = uFocus < -0.5 ? 1.0 : (abs(vS - uFocus) < 0.5 ? 1.0 : 0.22);
            float mDim = uMonth < -0.5 ? 1.0 : 0.55 + 0.45 * vAct;
            gl_FragColor = vec4(c * dim * mDim + (1.0 - dim) * 0.06, 1.0);
            ${CS}
          }`,
      });
      const mesh = new THREE.InstancedMesh(geo, mat, count);
      const m4 = new THREE.Matrix4();
      let i = 0;
      values.forEach((row, k) =>
        row.forEach((v, m) => {
          m4.makeTranslation((m - (M - 1) / 2) * GAP, 0, (k - (S - 1) / 2) * DZ);
          mesh.setMatrixAt(i, m4);
          aMonth[i] = m;
          aSeries[i] = k;
          aH[i] = (v / 100) * 3.6;
          i++;
        }),
      );
      geo.setAttribute('aMonth', new THREE.InstancedBufferAttribute(aMonth, 1));
      geo.setAttribute('aSeries', new THREE.InstancedBufferAttribute(aSeries, 1));
      geo.setAttribute('aH', new THREE.InstancedBufferAttribute(aH, 1));
      const group = new THREE.Group();
      group.add(mesh);
      scene.add(group);

      // floor grid with month ticks + a moving month marker
      const floorMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uMonth: { value: -1 }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
        fragmentShader: /* glsl */ `uniform float uMonth; uniform float uTime; varying vec3 vW;
          void main(){ vec2 q = vW.xz + vec2(0.5, 0.0); vec2 g = abs(fract(q * 2.0) - 0.5) / fwidth(q * 2.0); float l = 1.0 - min(min(g.x, g.y), 1.0);
            float mx = (uMonth - 5.5); float band = uMonth < -0.5 ? 0.0 : smoothstep(0.55, 0.45, abs(vW.x - mx));
            float fade = smoothstep(9.0, 3.0, length(vW.xz * vec2(0.8, 1.4)));
            vec3 c = vec3(0.16, 0.36, 0.7) * l + vec3(0.03, 0.57, 0.76) * band * (0.5 + 0.2 * sin(uTime * 4.0));
            gl_FragColor = vec4(c, (l * 0.55 + band * 0.35) * fade); ${CS} }`,
      });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 9).rotateX(-Math.PI / 2), floorMat);
      floor.position.y = -0.001;
      group.add(floor);

      // a glowing line along each series' tops
      const lines = values.map((row, k) => {
        const pts = row.map((v, m) => new THREE.Vector3((m - (M - 1) / 2) * GAP, (v / 100) * 3.6 + 0.12, (k - (S - 1) / 2) * DZ));
        const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
        const lg = new THREE.BufferGeometry().setFromPoints(curve.getPoints(120));
        const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: SERIES[k], transparent: true, opacity: 0.9 }));
        lg.setDrawRange(0, ctx.reduce ? 121 : 0);
        group.add(line);
        return line;
      });

      camera.fov = 32;
      let month = -1;
      let monthF = -1;
      let grow = ctx.reduce ? 1 : 0;
      let growT = ctx.reduce ? 1 : 0;
      let wide = true;

      const pickMonth = (e) => {
        const r = canvas.getBoundingClientRect();
        const x = e.clientX;
        let best = -1;
        let bd = Infinity;
        const v = new THREE.Vector3();
        for (let m = 0; m < M; m++) {
          v.set((m - (M - 1) / 2) * GAP, 1, 0).applyMatrix4(group.matrixWorld).project(camera);
          const sx = r.left + ((v.x + 1) / 2) * r.width;
          const d = Math.abs(sx - x);
          if (d < bd) {
            bd = d;
            best = m;
          }
        }
        return bd < (r.width / M) * 0.9 ? best : -1;
      };
      canvas.addEventListener('pointermove', (e) => {
        const m = pickMonth(e);
        if (m >= 0) onHover?.(m, e);
      });
      canvas.addEventListener('pointerleave', () => onHover?.(-1));
      canvas.addEventListener('click', (e) => {
        const m = pickMonth(e);
        if (m >= 0) onPick?.(m);
      });

      api = {
        setMonth(m) {
          month = m;
          if (ctx.reduce) monthF = m;
        },
        setFocus(k) {
          mat.uniforms.uFocus.value = k ?? -1;
        },
        setGrow(p) {
          growT = p;
        },
      };
      return {
        resize(w, h) {
          wide = w / h > 1.3;
        },
        update(t, dt, c) {
          grow = ctx.reduce ? growT : damp(grow, growT, 2.2, dt);
          if (month < 0) monthF = ctx.reduce ? -1 : damp(monthF < 0 ? 5.5 : monthF, 5.5, 2, dt);
          else monthF = ctx.reduce ? month : damp(monthF < 0 ? month : monthF, month, 6, dt);
          mat.uniforms.uTime.value = t;
          mat.uniforms.uGrow.value = grow;
          mat.uniforms.uMonth.value = month < 0 ? -1 : monthF;
          floorMat.uniforms.uMonth.value = month < 0 ? -1 : monthF;
          floorMat.uniforms.uTime.value = t;
          lines.forEach((l) => l.geometry.setDrawRange(0, Math.round(Math.min(1, Math.max(0, grow * 1.2 - 0.2)) * 121)));
          const focusX = month < 0 ? 0 : (monthF - 5.5) * GAP;
          const span = wide ? 0.35 : 0.85;
          const p = c.pointer;
          camera.position.set(focusX * span + 1.4 + p.x * 0.8, 5.6 + p.y * 0.5, wide ? 13 : 18);
          camera.lookAt(focusX * span * 0.9, 1.1, 0);
          group.rotation.y = -0.12;
        },
      };
    },
    { fov: 32, interactive: true, className: 'gl-cal', fade: 0.8 },
  );
  return stage.then((s) =>
    s && api
      ? {
          setMonth: (m) => (api.setMonth(m), s.invalidate()),
          setFocus: (k) => (api.setFocus(k), s.invalidate()),
          setGrow: (p) => (api.setGrow(p), s.invalidate()),
          destroy: () => s.destroy(),
        }
      : null,
  );
}
