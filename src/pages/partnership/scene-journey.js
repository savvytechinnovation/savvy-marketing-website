// Explore Partnership "journey": a road of light that is built as the visitor fills in each step.
//  - thousands of particles lie along a winding path into depth; the part already "built" glows in brand blue,
//    the leading edge sparkles in the accent colour, the rest waits as faint grey dust
//  - four gates (About you · Your business · Pick a time · Booked) light up as they are reached
//  - the camera travels along the path per step (GSAP), with pointer parallax
//  - on booking, a burst of particles converges into a check mark at the end of the road
import { gsap } from '../../ds/site.js';
import { createStage, SPRITE_FRAG } from '../fit-check/gl-stage.js';

export const GATES = [0.3, 0.55, 0.8, 1.0];
const CAM_U = { intro: 0.02, 1: 0.2, 2: 0.45, 3: 0.7, done: 0.97, 'not-yet': 0.5 };

const ROAD_VERT = /* glsl */ `
  attribute float aU;
  attribute float aSeed;
  uniform float uTime, uBuilt, uSize, uPR;
  uniform vec3 uGrey, uA, uB, uHead;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float built = smoothstep(uBuilt + 0.004, uBuilt - 0.004, aU);
    float head = exp(-abs(aU - uBuilt) * 90.0);
    float wave = 0.5 + 0.5 * sin(aU * 140.0 - uTime * 5.0);
    p.y += built * (0.04 + 0.05 * wave) + head * 0.35 * aSeed;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * (0.5 + aSeed * 0.8) * (1.0 + built * 0.5 + head * 1.0) / -mv.z, 9.0) * uPR;
    vec3 brand = mix(uA, uB, fract(aU * 3.0 + aSeed * 0.2));
    vColor = mix(uGrey, brand, built);
    vColor = mix(vColor, uHead, clamp(head * 1.4, 0.0, 1.0));
    float fade = smoothstep(46.0, 8.0, -mv.z) * smoothstep(2.0, 6.0, -mv.z);
    vAlpha = (0.35 + 0.55 * built + head * 0.4) * fade * (0.75 + 0.25 * wave * built);
  }
`;

const CHECK_VERT = /* glsl */ `
  attribute vec3 aStart;
  attribute float aSeed;
  uniform float uTime, uForm, uSize, uPR;
  uniform vec3 uA, uB;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float k = smoothstep(aSeed * 0.5, aSeed * 0.5 + 0.5, uForm);
    vec3 p = mix(aStart, position, k);
    p.z += sin(uTime * 2.0 + aSeed * 30.0) * 0.03;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * (0.6 + aSeed * 0.8) / -mv.z, 14.0) * uPR;
    vColor = mix(uA, uB, aSeed);
    vAlpha = uForm > 0.0 ? (0.25 + 0.75 * k) : 0.0;
  }
`;

const SPRITE_NORMAL = SPRITE_FRAG.replace('vColor * (0.6 + core * 0.9)', 'vColor');

export async function mountJourney(el) {
  let built = 0.04;
  const stage = await createStage(el, {
    lazy: false,
    antialias: false,
    dpr: 1.5,
    fov: 50,
    async build({ THREE, scene, camera, renderer, small }) {
      const curve = new THREE.CatmullRomCurve3(
        [
          [0, 0, 4],
          [0, 0, 0],
          [1.3, 0, -8],
          [-1.5, 0, -16],
          [1.2, 0, -24],
          [-1.0, 0, -32],
          [0.5, 0, -40],
          [0, 0, -46],
        ].map((v) => new THREE.Vector3(...v)),
        false,
        'centripetal',
      );
      // keep u in [0,1] mapped to the visible part after the lead-in point
      const U0 = 0.07;
      const at = (u) => curve.getPointAt(U0 + u * (1 - U0));
      const tan = (u) => curve.getTangentAt(U0 + u * (1 - U0));

      const M = small ? 3200 : 9000;
      const pos = new Float32Array(M * 3);
      const aU = new Float32Array(M);
      const aSeed = new Float32Array(M);
      const v = new THREE.Vector3();
      for (let i = 0; i < M; i++) {
        const u = Math.random();
        const p = at(u);
        const t = tan(u);
        const w = (Math.random() * 2 - 1) * (Math.random() < 0.18 ? 1.25 : 0.85);
        v.set(t.z, 0, -t.x).normalize().multiplyScalar(w);
        pos.set([p.x + v.x, (Math.random() - 0.5) * 0.04, p.z + v.z], i * 3);
        aU[i] = u;
        aSeed[i] = Math.random();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
      const pr = renderer.getPixelRatio();
      const roadU = {
        uTime: { value: 0 },
        uBuilt: { value: built },
        uSize: { value: small ? 30 : 26 },
        uPR: { value: pr },
        uGrey: { value: new THREE.Color('#b9c3d8') },
        uA: { value: new THREE.Color('#0792c2') },
        uB: { value: new THREE.Color('#293baa') },
        uHead: { value: new THREE.Color('#ff5527') },
      };
      const road = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: roadU, vertexShader: ROAD_VERT, fragmentShader: SPRITE_NORMAL, transparent: true, depthWrite: false }));
      road.frustumCulled = false;
      scene.add(road);

      // Rails: two thin lines along the edges
      const railPts = (side) => {
        const out = [];
        for (let k = 0; k <= 240; k++) {
          const u = k / 240;
          const p = at(u);
          const t = tan(u);
          out.push(new THREE.Vector3(p.x + t.z * side, 0.01, p.z - t.x * side));
        }
        return out;
      };
      [-1.05, 1.05].forEach((s) => scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(railPts(s)), new THREE.LineBasicMaterial({ color: '#9fb0cf', transparent: true, opacity: 0.35 }))));

      // Floor grid
      const grid = new THREE.GridHelper(120, 60, '#d5ddeb', '#e3e9f3');
      grid.position.set(0, -0.02, -20);
      grid.material.transparent = true;
      grid.material.opacity = 0.55;
      scene.add(grid);
      scene.fog = new THREE.Fog('#f5f7fb', 12, 46);

      // Gates (arches the road passes through)
      const gates = GATES.map((u, i) => {
        const g = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.022, 8, 96, Math.PI), new THREE.MeshBasicMaterial({ color: '#b9c3d8', transparent: true, opacity: 0.9 }));
        const p = at(u);
        const t = tan(u);
        g.position.set(p.x, 0, p.z);
        g.lookAt(p.x + t.x, 0, p.z + t.z);
        g.userData.u = u;
        scene.add(g);
        // gate index dot
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: '#b9c3d8' }));
        dot.position.set(p.x, 1.25, p.z);
        scene.add(dot);
        g.userData.dot = dot;
        g.userData.i = i;
        return g;
      });

      // Check-mark celebration at the end of the road
      const P = small ? 900 : 1800;
      const cpos = new Float32Array(P * 3);
      const cstart = new Float32Array(P * 3);
      const cseed = new Float32Array(P);
      const A = new THREE.Vector2(-0.75, 0.05);
      const B = new THREE.Vector2(-0.2, -0.5);
      const C = new THREE.Vector2(0.9, 0.7);
      const L1 = A.distanceTo(B);
      const L2 = B.distanceTo(C);
      for (let i = 0; i < P; i++) {
        const s = Math.random() * (L1 + L2);
        const q = s < L1 ? A.clone().lerp(B, s / L1) : B.clone().lerp(C, (s - L1) / L2);
        cpos.set([q.x * 1.3 + (Math.random() - 0.5) * 0.12, q.y * 1.3 + (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12], i * 3);
        const r = 2 + Math.random() * 4;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        cstart.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
        cseed[i] = Math.random();
      }
      const cgeo = new THREE.BufferGeometry();
      cgeo.setAttribute('position', new THREE.BufferAttribute(cpos, 3));
      cgeo.setAttribute('aStart', new THREE.BufferAttribute(cstart, 3));
      cgeo.setAttribute('aSeed', new THREE.BufferAttribute(cseed, 1));
      const checkU = {
        uTime: { value: 0 },
        uForm: { value: 0 },
        uSize: { value: small ? 90 : 80 },
        uPR: { value: pr },
        uA: { value: new THREE.Color('#1fa774') },
        uB: { value: new THREE.Color('#0792c2') },
      };
      const check = new THREE.Points(cgeo, new THREE.ShaderMaterial({ uniforms: checkU, vertexShader: CHECK_VERT, fragmentShader: SPRITE_NORMAL, transparent: true, depthWrite: false }));
      check.frustumCulled = false;
      const end = at(1);
      check.position.set(end.x, 1.9, end.z);
      check.scale.setScalar(1.5);
      scene.add(check);

      const cam = { u: CAM_U.intro };
      const look = new THREE.Vector3();
      const cur = { built };
      const lit = new THREE.Color('#0792c2');
      const head = new THREE.Color('#ff5527');
      const grey = new THREE.Color('#b9c3d8');
      return {
        cam,
        checkU,
        update(t, dt, c) {
          cur.built += (built - cur.built) * (c.reduce ? 1 : 1 - Math.pow(0.04, dt));
          roadU.uTime.value = t;
          roadU.uBuilt.value = cur.built;
          checkU.uTime.value = t;
          const u = Math.min(cam.u, 0.97);
          const p = at(u);
          const ahead = at(Math.min(1, u + 0.16));
          camera.position.set(p.x * 0.6 + c.pointer.x * 0.5, 3.0 + c.pointer.y * 0.25, p.z + 5.5);
          look.set(ahead.x, -0.6, ahead.z);
          camera.lookAt(look);
          check.lookAt(camera.position);
          gates.forEach((g) => {
            const on = cur.built >= g.userData.u - 0.002;
            const near = Math.abs(cur.built - g.userData.u) < 0.03 || (!on && g.userData.u - cur.built < 0.25 && g.userData.u - cur.built > 0);
            const col = on ? lit : near ? head : grey;
            g.material.color.lerp(col, 0.1);
            g.userData.dot.material.color.lerp(col, 0.1);
            const s = on ? 1 + 0.04 * Math.sin(t * 3 + g.userData.i) : 1;
            g.userData.dot.scale.setScalar(s * (near && !on ? 1.6 : 1));
          });
        },
      };
    },
  });
  if (!stage) return null;
  const { api } = stage;
  const reduce = stage.ctx.reduce;
  return {
    /** Move the camera to a view ('intro' | 1 | 2 | 3 | 'done' | 'not-yet'). */
    view(name) {
      gsap.to(api.cam, { u: CAM_U[name] ?? 0, duration: reduce ? 0 : 1.8, ease: 'power3.inOut', overwrite: 'auto', onUpdate: () => stage.invalidate() });
    },
    /** Built length of the road (0..1). */
    build(u) {
      built = Math.max(0.04, Math.min(1, u));
      stage.invalidate();
    },
    celebrate() {
      built = 1;
      gsap.fromTo(api.checkU.uForm, { value: 0.001 }, { value: 1, duration: reduce ? 0 : 2.4, ease: 'power3.out', delay: reduce ? 0 : 0.8, onUpdate: () => stage.invalidate() });
      stage.invalidate();
    },
    destroy: stage.destroy,
  };
}
