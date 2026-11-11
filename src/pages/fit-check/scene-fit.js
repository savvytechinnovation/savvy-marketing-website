// Fit check stage: thousands of particles that assemble into the Savvy isologo as the fit improves.
//  - uAssemble (0→1): share of particles locked into the logo = running fit points / 100
//  - uBlock (0→1): a blocker answer scatters the outer shell and tints it in the accent red
//  - uBurst: bloom-like pulse for a strong-fit result (bigger, brighter sprites + radial kick)
//  - the camera orbits to a new angle for every question (smooth GSAP tween), with pointer parallax
// The logo is always centred on [data-fc-stage] via camera.setViewOffset (the canvas fills the section).
import { gsap } from '../../ds/site.js';
import { createStage, samplePoints, SPRITE_FRAG } from './gl-stage.js';

const ANGLES = [
  [-0.55, 0.12],
  [-0.3, -0.08],
  [0.0, 0.16],
  [0.32, -0.04],
  [0.55, 0.1],
  [0.28, -0.14],
  [-0.05, 0.06],
  [-0.36, -0.1],
  [-0.15, 0.14],
];

const VERT = /* glsl */ `
  attribute vec3 aLogo;
  attribute vec3 aScatter;
  attribute vec3 aColor;
  attribute float aSeed;
  uniform float uTime, uAssemble, uBlock, uBurst, uSize, uPR;
  uniform vec3 uRed;
  varying vec3 vColor;
  varying float vAlpha;
  vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
  void main() {
    float th = aSeed * 0.92;
    float k = smoothstep(th, th + 0.08, uAssemble);
    // free particles drift on a slow swirl
    vec3 free = rotY(aScatter, uTime * (0.05 + aSeed * 0.08));
    free.y += sin(uTime * 0.6 + aSeed * 40.0) * 0.18;
    vec3 logo = aLogo + vec3(0.0, 0.0, sin(uTime * 1.3 + aLogo.x * 3.0 + aLogo.y * 2.0) * 0.04);
    vec3 p = mix(free, logo, k);
    // blockers: turbulence pushes the outer shell away
    float shake = uBlock * (0.35 + 0.65 * fract(aSeed * 13.7));
    vec3 dir = normalize(p + vec3(0.0001));
    p += dir * shake * (0.5 + 0.5 * sin(uTime * 2.6 + aSeed * 60.0)) * 0.9;
    // burst: radial kick
    p += dir * uBurst * (0.4 + aSeed * 1.8);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float sz = uSize * (0.55 + aSeed * 0.9) * (1.0 + k * 0.35 + uBurst * 1.6);
    gl_PointSize = sz * uPR / -mv.z;
    float tint = uBlock * step(0.45, fract(aSeed * 7.31));
    vColor = mix(aColor, uRed, tint) * (1.0 + uBurst * 1.4);
    vAlpha = (0.5 + 0.5 * k) * (0.7 + 0.3 * sin(uTime * 2.0 + aSeed * 30.0));
  }
`;

export async function mountFitScene(el, stageEl) {
  let state = { assemble: 0.04, block: 0, step: 0 };
  const stage = await createStage(el, {
    fov: 35,
    antialias: false,
    dpr: 1.5,
    async build({ THREE, scene, camera, renderer, small, reduce }) {
      const N = small ? 3800 : 9000;
      const logoXY = await samplePoints('/brand/isologo-gradient.svg', N);
      const aLogo = new Float32Array(N * 3);
      const aScatter = new Float32Array(N * 3);
      const aColor = new Float32Array(N * 3);
      const aSeed = new Float32Array(N);
      const c1 = new THREE.Color('#2b47ff');
      const c2 = new THREE.Color('#0792c2');
      const c3 = new THREE.Color('#9be8ff');
      const tmp = new THREE.Color();
      for (let i = 0; i < N; i++) {
        const x = logoXY[i * 2] * 1.6;
        const y = logoXY[i * 2 + 1] * 1.6;
        aLogo.set([x, y, (Math.random() - 0.5) * 0.28], i * 3);
        const r = 2.4 + Math.pow(Math.random(), 0.6) * 4.2;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        aScatter.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.62, r * Math.sin(ph) * Math.sin(th)], i * 3);
        const g = Math.min(1, Math.max(0, (x + y) / 3.2 + 0.5));
        tmp.copy(c1).lerp(c2, Math.min(1, g * 1.6));
        if (g > 0.6) tmp.lerp(c3, (g - 0.6) * 1.6);
        aColor.set([tmp.r, tmp.g, tmp.b], i * 3);
        aSeed[i] = Math.random();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(aLogo.slice(), 3));
      geo.setAttribute('aLogo', new THREE.BufferAttribute(aLogo, 3));
      geo.setAttribute('aScatter', new THREE.BufferAttribute(aScatter, 3));
      geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
      const uniforms = {
        uTime: { value: 0 },
        uAssemble: { value: state.assemble },
        uBlock: { value: 0 },
        uBurst: { value: 0 },
        uSize: { value: small ? 40 : 36 },
        uPR: { value: renderer.getPixelRatio() },
        uRed: { value: new THREE.Color('#ff5527') },
      };
      const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: SPRITE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      const group = new THREE.Group();
      group.add(points);

      // Orbit rings (thin, brighten as the logo assembles)
      const rings = [];
      [2.15, 2.6, 3.2].forEach((r, i) => {
        const pts = [];
        for (let k = 0; k <= 128; k++) pts.push(new THREE.Vector3(Math.cos((k / 128) * Math.PI * 2) * r, Math.sin((k / 128) * Math.PI * 2) * r, 0));
        const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: i === 1 ? '#ff5527' : '#5fd3ff', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
        line.rotation.set(1.1 + i * 0.25, i * 0.6, 0);
        rings.push(line);
        group.add(line);
      });

      // Far dust
      const D = small ? 500 : 1200;
      const dpos = new Float32Array(D * 3);
      for (let i = 0; i < D; i++) dpos.set([(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 24, -6 - Math.random() * 20], i * 3);
      const dgeo = new THREE.BufferGeometry();
      dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
      const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ color: '#7fb8ff', size: small ? 0.07 : 0.05, transparent: true, opacity: 0.45, depthWrite: false }));
      scene.add(dust, group);

      const cam = { theta: ANGLES[0][0], phi: ANGLES[0][1], dist: 9.6, spin: 0 };
      const look = new THREE.Vector3();
      const cur = { assemble: state.assemble, block: 0 };

      return {
        cam,
        uniforms,
        resize(w, h) {
          // centre the logo on the stage box and scale it to the box
          const er = el.getBoundingClientRect();
          const sr = stageEl.getBoundingClientRect();
          const cx = sr.left - er.left + sr.width / 2;
          const cy = sr.top - er.top + sr.height / 2;
          camera.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h);
          const visH = 2 * cam.dist * Math.tan((camera.fov * Math.PI) / 360);
          const box = Math.min(sr.width, sr.height) / h;
          group.scale.setScalar(Math.max(0.45, Math.min(1.25, (box * visH) / 3.9)));
        },
        update(t, dt, c) {
          const lerp = reduce ? 1 : 1 - Math.pow(0.02, dt);
          cur.assemble += (state.assemble - cur.assemble) * (reduce ? 1 : lerp * 0.9);
          cur.block += (state.block - cur.block) * (reduce ? 1 : lerp);
          uniforms.uTime.value = t;
          uniforms.uAssemble.value = cur.assemble;
          uniforms.uBlock.value = cur.block;
          rings.forEach((r, i) => {
            r.rotation.z = t * (0.05 + i * 0.03) * (i % 2 ? -1 : 1);
            r.material.opacity = 0.06 + cur.assemble * 0.22 + (i === 1 ? cur.block * 0.3 : 0);
          });
          dust.rotation.y = t * 0.01;
          const th = cam.theta + cam.spin + (reduce ? 0 : c.pointer.x * 0.12);
          const ph = cam.phi + (reduce ? 0 : c.pointer.y * 0.08);
          camera.position.set(Math.sin(th) * Math.cos(ph) * cam.dist, Math.sin(ph) * cam.dist, Math.cos(th) * Math.cos(ph) * cam.dist);
          camera.lookAt(look);
        },
      };
    },
  });
  if (!stage) return null;
  const { api, ctx } = stage;
  const reduce = ctx.reduce;
  const re = () => api.resize?.(ctx.size.w, ctx.size.h);
  addEventListener('resize', re);
  // the stage column is sticky: keep the logo centred on it while the section scrolls
  let raf = 0;
  addEventListener('scroll', () => (raf ||= requestAnimationFrame(() => ((raf = 0), re(), stage.invalidate()))), { passive: true });
  // the section layout settles after fonts/splits: re-centre a few times
  setTimeout(re, 600);
  setTimeout(re, 1800);
  return {
    /** fit: { assemble 0..1, block 0..1 } */
    set(next) {
      state = { ...state, ...next };
      stage.invalidate();
    },
    step(i) {
      const a = ANGLES[Math.max(0, Math.min(ANGLES.length - 1, i))];
      gsap.to(api.cam, { theta: a[0], phi: a[1], dist: 9.6 - i * 0.12, spin: 0, duration: reduce ? 0 : 1.6, ease: 'power3.inOut', overwrite: 'auto', onComplete: () => stage.invalidate() });
      re();
    },
    result({ outcome, score }) {
      state = { ...state, assemble: Math.max(0.04, score / 100), block: outcome === 'not-yet' ? 1 : 0 };
      if (reduce) {
        Object.assign(api.cam, { theta: 0, phi: 0.04, dist: 8.4 });
        return stage.invalidate();
      }
      gsap.to(api.cam, { theta: 0, phi: 0.04, dist: 8.4, duration: 2, ease: 'power3.inOut', overwrite: 'auto' });
      gsap.fromTo(api.cam, { spin: -Math.PI * 2 }, { spin: 0, duration: 2.4, ease: 'expo.out' });
      if (outcome === 'strong') {
        gsap.timeline().to(api.uniforms.uBurst, { value: 1, duration: 0.28, ease: 'power2.out', delay: 0.9 }).to(api.uniforms.uBurst, { value: 0, duration: 1.8, ease: 'expo.out' });
      }
    },
    camera: () => api.cam,
    relayout: re,
    destroy: stage.destroy,
  };
}
