// Round 2 · Industries: one full-bleed WebGL hero scene with a signature variant per industry.
//
//   mountIndustryScene(el, { variant: 'hvac'|'plumbing'|'electrical'|'roofing'|'cleaning'|'hub', onPick })
//   → Promise<{ setProgress(p), setScroll(p), setActive(i), destroy() } | null>
//
//   hvac        3D thermostat dial + hot/cold airflow particles (progress = Cool → Shoulder → Heat)
//   plumbing    chrome pipe run with flowing water windows, drips and a displaced water surface
//   electrical  circuit grid with travelling current pulses + lightning arcs from a floating core (progress = live circuits)
//   roofing     procedural house in a storm: fbm clouds, rain streaks, lightning flashes, wet shingles
//   cleaning    iridescent thin-film soap bubbles, twinkling sparkles and a squeegee sweep of light
//   hub         the five industry emblems orbiting a core — click / keyboard (via setActive) to pick
//
// Built on ../results/gl-kit.js (lazy three, pause off-screen, DPR caps, reduced motion = still frame).
import { glStage, GLSL_NOISE, rng, damp, raw } from '../results/gl-kit.js';

const BRAND = { blue: '#0792c2', dark: '#293baa', darker: '#141a40', accent: '#ff5527' };
export const IND_COLORS = { hvac: '#38bdf8', plumbing: '#4f7cff', electrical: '#ffb020', roofing: '#ff5527', cleaning: '#2dd4bf' };

const CS = ''; // colours below are authored in display (sRGB) values and written straight out

// Generic lit "emblem" material (fresnel rim + key light + spec), works with instancing.
const EMBLEM_VS = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vIC;
  void main(){
    vec4 lp = vec4(position, 1.0);
    vIC = vec3(1.0);
    #ifdef USE_INSTANCING_COLOR
      vIC = instanceColor;
    #endif
    vec3 nn = normal;
    #ifdef USE_INSTANCING
      lp = instanceMatrix * lp; nn = mat3(instanceMatrix) * nn;
    #endif
    vec4 wp = modelMatrix * lp;
    vP = position; vN = normalize(mat3(modelMatrix) * nn); vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const EMBLEM_FS = /* glsl */ `
  uniform vec3 uColor; uniform float uGlow; uniform float uDim;
  varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vIC;
  void main(){
    vec3 n = normalize(vN); vec3 v = normalize(vV);
    vec3 col = uColor * vIC;
    vec3 l = normalize(vec3(0.5, 0.9, 0.7));
    float diff = max(dot(n, l), 0.0) * 0.75 + 0.25;
    float fr = pow(1.0 - max(dot(n, v), 0.0), 2.6);
    float spec = pow(max(dot(reflect(-l, n), v), 0.0), 36.0);
    vec3 c = col * diff * (0.55 + 0.45 * uGlow) + fr * mix(col, vec3(1.0), 0.35) * (0.5 + uGlow) + spec * 0.7;
    gl_FragColor = vec4(c * uDim, 1.0);
    ${CS}
  }`;

function emblemMat(THREE, color, extra = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: raw(THREE, color) }, uGlow: { value: 0.4 }, uDim: { value: 1 } },
    vertexShader: EMBLEM_VS,
    fragmentShader: EMBLEM_FS,
    ...extra,
  });
}

// Thin-film iridescence (soap bubble)
const BUBBLE_VS = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vO;
  void main(){
    vec4 lp = vec4(position, 1.0); vec3 nn = normal;
    #ifdef USE_INSTANCING
      lp = instanceMatrix * lp; nn = mat3(instanceMatrix) * nn;
    #endif
    vec4 wp = modelMatrix * lp;
    vO = position; vN = normalize(mat3(modelMatrix) * nn); vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const BUBBLE_FS = /* glsl */ `
  uniform float uTime; uniform float uAlpha;
  varying vec3 vN; varying vec3 vV; varying vec3 vO;
  ${GLSL_NOISE}
  void main(){
    vec3 n = normalize(vN); vec3 v = normalize(vV);
    float ndv = max(dot(n, v), 0.0);
    float fr = pow(1.0 - ndv, 2.2);
    float film = fbm(vO.xy * 2.2 + vec2(uTime * 0.12, vO.z * 1.7 - uTime * 0.08));
    float hue = fract(film * 1.6 + ndv * 0.9 + uTime * 0.02);
    vec3 iri = hsv2rgb(vec3(hue, 0.55, 1.0));
    vec3 l = normalize(vec3(-0.4, 0.8, 0.6));
    float spec = pow(max(dot(reflect(-l, n), v), 0.0), 60.0) * 1.4;
    float spec2 = pow(max(dot(reflect(-normalize(vec3(0.6, -0.3, 0.7)), n), v), 0.0), 24.0) * 0.35;
    vec3 c = iri * (0.25 + fr * 1.1) + spec + spec2;
    float a = clamp(0.06 + fr * 0.9 + spec, 0.0, 1.0) * uAlpha;
    gl_FragColor = vec4(c, a);
    ${CS}
  }`;

function bubbleMat(THREE) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: BUBBLE_VS,
    fragmentShader: BUBBLE_FS,
    transparent: true,
    depthWrite: false,
  });
}

// Soft round additive points
function pointsMat(THREE, { vs, fs = null, uniforms = {} }) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 }, ...uniforms },
    vertexShader: vs,
    fragmentShader:
      fs ||
      /* glsl */ `varying vec3 vC; varying float vA;
      void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.0, r); gl_FragColor = vec4(vC * a, a * vA); ${CS} }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

// =====================================================================================================================
// Variants
// =====================================================================================================================
const VARIANTS = {
  // ---------------------------------------------------------------- HVAC
  hvac(ctx) {
    const { THREE, small } = ctx;
    const root = new THREE.Group();
    const R = 1.7;
    // dial ring: angle-based fill, cold → hot
    const ringMat = new THREE.ShaderMaterial({
      uniforms: { uFill: { value: 0.84 }, uMode: { value: 0.5 }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){ vP = position; vec4 wp = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: /* glsl */ `uniform float uFill; uniform float uMode; uniform float uTime; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){
          float a = atan(vP.x, vP.y); float t = fract(-a / 6.28318 + 1.0);
          vec3 cold = vec3(0.22, 0.74, 0.97), hot = vec3(1.0, 0.33, 0.15), mid = vec3(0.03, 0.57, 0.76);
          vec3 grad = mix(cold, hot, smoothstep(0.0, 1.0, t * 0.6 + uMode * 0.55));
          float on = step(t, uFill);
          float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
          vec3 steel = vec3(0.12, 0.15, 0.3) + fr * 0.35;
          float pulse = 0.85 + 0.15 * sin(uTime * 3.0 - t * 18.0);
          vec3 c = mix(steel, grad * (1.1 + fr) * pulse, on);
          gl_FragColor = vec4(c, 1.0); ${CS} }`,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.15, 24, small ? 120 : 200), ringMat);
    root.add(ring);
    // glass face
    const faceMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMode: { value: 0.5 } },
      transparent: true,
      vertexShader: /* glsl */ `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `uniform float uTime; uniform float uMode; varying vec2 vU; ${GLSL_NOISE}
        void main(){ vec2 p = vU - 0.5; float r = length(p) * 2.0;
          float rings = smoothstep(0.02, 0.0, abs(fract(r * 6.0 - uTime * 0.15) - 0.5) - 0.46) * 0.25;
          float n = fbm(p * 5.0 + uTime * 0.05);
          vec3 base = mix(vec3(0.05, 0.08, 0.22), vec3(0.09, 0.14, 0.36), n);
          vec3 tint = mix(vec3(0.2, 0.6, 1.0), vec3(1.0, 0.4, 0.2), uMode);
          vec3 c = base + tint * (rings + smoothstep(1.0, 0.0, r) * 0.12);
          gl_FragColor = vec4(c, 0.92 * smoothstep(1.0, 0.96, r)); ${CS} }`,
    });
    const face = new THREE.Mesh(new THREE.CircleGeometry(R - 0.1, 96), faceMat);
    face.position.z = -0.04;
    root.add(face);
    // ticks
    const TICKS = 72;
    const tickMat = emblemMat(THREE, '#ffffff');
    const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.16, 0.05), tickMat, TICKS);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const tickColor = new THREE.Color();
    for (let i = 0; i < TICKS; i++) {
      const a = (i / TICKS) * Math.PI * 2;
      const long = i % 6 === 0;
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -a);
      m4.compose(new THREE.Vector3(Math.sin(a) * (R + 0.36), Math.cos(a) * (R + 0.36), 0), q, new THREE.Vector3(1, long ? 1.7 : 1, 1));
      ticks.setMatrixAt(i, m4);
      ticks.setColorAt(i, tickColor.setStyle('#334155', THREE.LinearSRGBColorSpace));
    }
    root.add(ticks);
    // inner knob + needle
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.22, 48).rotateX(Math.PI / 2), emblemMat(THREE, '#cbd5e1'));
    knob.position.z = 0.1;
    root.add(knob);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 0.05).translate(0, 0.62, 0), emblemMat(THREE, BRAND.accent));
    needle.position.z = 0.2;
    root.add(needle);

    // airflow particles
    const N = small ? 1600 : 4200;
    const seeds = new Float32Array(N * 4);
    const r = rng(7);
    for (let i = 0; i < N * 4; i++) seeds[i] = r();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const pMat = pointsMat(THREE, {
      uniforms: { uMode: { value: 0.5 }, uSpeed: { value: 1 } },
      vs: /* glsl */ `attribute vec4 aSeed; uniform float uTime; uniform float uPR; uniform float uMode; uniform float uSpeed; varying vec3 vC; varying float vA;
        void main(){
          float s = fract(aSeed.x + uTime * (0.035 + aSeed.w * 0.05) * uSpeed);
          float dir = aSeed.y > 0.5 ? 1.0 : -1.0;
          float ang = aSeed.y * 6.2831 + s * 7.0 * dir;
          float rad = 2.15 + aSeed.z * 2.6 + sin(s * 9.0 + aSeed.w * 20.0) * 0.25;
          vec3 p = vec3(cos(ang) * rad, sin(ang) * rad * 0.62 + (s - 0.5) * 1.6 * dir, sin(s * 3.1416 + aSeed.x * 6.0) * 2.2 - 0.6);
          float hot = step(aSeed.w, uMode);
          vC = mix(vec3(0.3, 0.78, 1.0), vec3(1.0, 0.42, 0.18), hot) * (0.7 + aSeed.z * 0.6);
          vA = sin(s * 3.1416) * 0.85;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (2.0 + aSeed.z * 5.0) * uPR * (6.0 / -mv.z);
          gl_Position = projectionMatrix * mv; }`,
    });
    const pts = new THREE.Points(g, pMat);
    pts.frustumCulled = false;
    root.add(pts);

    const cold = raw(THREE, '#38bdf8');
    const hot = raw(THREE, '#ff5527');
    let mode = 0.5;
    let fill = 0.84;
    let modeT = 0.5;
    let fillT = 0.84;
    return {
      root,
      setProgress(p, extra) {
        modeT = p;
        if (extra?.value != null) fillT = extra.value / 100;
      },
      update(t, dt) {
        mode = ctx.reduce ? modeT : damp(mode, modeT, 4, dt);
        fill = ctx.reduce ? fillT : damp(fill, fillT, 4, dt);
        ringMat.uniforms.uFill.value = fill;
        ringMat.uniforms.uMode.value = mode;
        ringMat.uniforms.uTime.value = t;
        faceMat.uniforms.uTime.value = t;
        faceMat.uniforms.uMode.value = mode;
        pMat.uniforms.uTime.value = t;
        pMat.uniforms.uMode.value = mode;
        needle.rotation.z = -fill * Math.PI * 2;
        const lit = Math.round(fill * TICKS);
        for (let i = 0; i < TICKS; i++) ticks.setColorAt(i, i < lit ? tickColor.copy(cold).lerp(hot, Math.min(1, (i / TICKS) * 0.6 + mode * 0.55)) : tickColor.setStyle('#2a3352', THREE.LinearSRGBColorSpace));
        ticks.instanceColor.needsUpdate = true;
        root.rotation.z = Math.sin(t * 0.3) * 0.03;
      },
    };
  },

  // ---------------------------------------------------------------- Plumbing
  plumbing(ctx) {
    const { THREE, small } = ctx;
    const root = new THREE.Group();
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const runs = [
      [V(-6, 1.6, -1), V(-2, 1.6, -1), V(-1.4, 1.5, -1), V(-1.2, 1.0, -1), V(-1.2, -0.2, -1), V(-1, -0.6, -1), V(-0.4, -0.7, -1), V(1.6, -0.7, -1), V(2, -0.4, -1), V(2.1, 0.4, -1)],
      [V(6, 2.2, -2), V(3.4, 2.2, -2), V(2.9, 2.1, -2), V(2.7, 1.6, -2), V(2.7, 0.2, -2), V(2.6, -0.2, -2), V(2.1, -0.3, -2), V(0.4, -0.3, -2)],
      [V(-5.5, -0.6, 0.6), V(-3, -0.6, 0.6), V(-2.6, -0.5, 0.6), V(-2.5, 0.0, 0.6), V(-2.5, 0.9, 0.6), V(-2.3, 1.2, 0.6), V(-1.8, 1.25, 0.6), V(0.6, 1.25, 0.6)],
    ];
    const pipeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: EMBLEM_VS,
      fragmentShader: /* glsl */ `varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){ vec3 n = normalize(vN), v = normalize(vV);
          float fr = pow(1.0 - max(dot(n, v), 0.0), 2.0);
          float band = pow(max(dot(n, normalize(vec3(0.2, 1.0, 0.4))), 0.0), 18.0);
          float band2 = pow(max(dot(n, normalize(vec3(-0.6, -0.2, 1.0))), 0.0), 6.0);
          vec3 base = vec3(0.16, 0.2, 0.32) + vec3(0.3, 0.36, 0.5) * max(dot(n, vec3(0.0, 1.0, 0.3)), 0.0);
          vec3 c = base + band * vec3(1.0) + band2 * vec3(0.25, 0.45, 0.8) + fr * vec3(0.2, 0.5, 0.9);
          gl_FragColor = vec4(c, 1.0); ${CS} }`,
    });
    const flowMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFlow: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `uniform float uTime; uniform float uFlow; varying vec2 vU;
        void main(){
          float seg = fract(vU.x * 3.0);
          float win = smoothstep(0.0, 0.02, seg - 0.35) * smoothstep(0.0, 0.02, 0.65 - seg);
          float s = fract(vU.x * 40.0 - uTime * 1.2 * uFlow);
          float stripe = smoothstep(0.0, 0.4, s) * smoothstep(1.0, 0.6, s);
          float side = smoothstep(0.15, 0.5, abs(fract(vU.y) - 0.5));
          float a = win * (0.1 + stripe * 0.5) * side;
          gl_FragColor = vec4(vec3(0.3, 0.7, 1.0) * a, a); ${CS} }`,
    });
    runs.forEach((pts) => pts.forEach((p) => (p.x = p.x * 0.5 + 1.0)));
    const curves = runs.map((pts) => new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.08));
    curves.forEach((c, i) => {
      const seg = small ? 160 : 260;
      root.add(new THREE.Mesh(new THREE.TubeGeometry(c, seg, 0.2 - i * 0.02, 20, false), pipeMat));
      const glow = new THREE.Mesh(new THREE.TubeGeometry(c, seg, 0.215 - i * 0.02, 16, false), flowMat);
      root.add(glow);
      // flanges along each run
      [0.18, 0.5, 0.82].forEach((u) => {
        const f = new THREE.Mesh(new THREE.TorusGeometry(0.235 - i * 0.02, 0.05, 10, 36), pipeMat);
        const p = c.getPointAt(u);
        f.position.copy(p);
        f.lookAt(p.clone().add(c.getTangentAt(u)));
        root.add(f);
      });
    });
    // outlet spout (end of run 0) + drips
    const outlet = curves[0].getPointAt(1);
    const DN = small ? 60 : 140;
    const dg = new THREE.BufferGeometry();
    const ds = new Float32Array(DN * 2);
    const r = rng(11);
    for (let i = 0; i < DN * 2; i++) ds[i] = r();
    dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DN * 3), 3));
    dg.setAttribute('aSeed', new THREE.BufferAttribute(ds, 2));
    const dMat = pointsMat(THREE, {
      uniforms: { uFrom: { value: outlet.clone().add(new THREE.Vector3(0, 0.25, 0)) }, uFlow: { value: 1 } },
      vs: /* glsl */ `attribute vec2 aSeed; uniform float uTime; uniform float uPR; uniform vec3 uFrom; uniform float uFlow; varying vec3 vC; varying float vA;
        void main(){ float s = fract(aSeed.x + uTime * (0.45 + aSeed.y * 0.2) * uFlow);
          vec3 p = uFrom + vec3((aSeed.y - 0.5) * 0.4 * s, 0.6 * s - 4.6 * s * s, (aSeed.x - 0.5) * 0.3 * s);
          vC = vec3(0.45, 0.8, 1.0); vA = 0.9 * (1.0 - s);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (3.0 + aSeed.y * 4.0) * uPR * (6.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    });
    const drips = new THREE.Points(dg, dMat);
    drips.frustumCulled = false;
    root.add(drips);
    // water surface
    const wMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uHit: { value: new THREE.Vector2(outlet.x, outlet.z) } },
      transparent: true,
      vertexShader: /* glsl */ `uniform float uTime; varying vec3 vW; varying float vH; varying vec3 vN;
        float h(vec2 p){ return sin(p.x * 0.9 + uTime * 1.1) * 0.08 + sin(p.y * 1.3 - uTime * 0.8 + p.x * 0.4) * 0.06 + sin((p.x + p.y) * 2.4 + uTime * 1.9) * 0.025; }
        void main(){ vec3 p = position; vec2 q = p.xy; float e = 0.05;
          float hh = h(q); vec3 n = normalize(vec3(-(h(q + vec2(e, 0.0)) - hh) / e, -(h(q + vec2(0.0, e)) - hh) / e, 1.0));
          p.z += hh; vH = hh; vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * n);
          gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */ `uniform float uTime; uniform vec2 uHit; varying vec3 vW; varying float vH; varying vec3 vN; ${GLSL_NOISE}
        void main(){ vec3 v = normalize(cameraPosition - vW); vec3 n = normalize(vN);
          float d = length(vW.xz - uHit); float ripple = sin(d * 14.0 - uTime * 6.0) * exp(-d * 1.4) * 0.5 + 0.5;
          n = normalize(n + vec3(0.0, 0.0, 0.0) + vec3((ripple - 0.5) * 0.25, 0.0, 0.0));
          float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          float spec = pow(max(dot(reflect(-normalize(vec3(-0.3, 1.0, -0.8)), n), v), 0.0), 80.0);
          float caust = fbm(vW.xz * 1.6 + uTime * 0.25);
          vec3 deep = vec3(0.02, 0.08, 0.25), shallow = vec3(0.05, 0.42, 0.75);
          vec3 c = mix(deep, shallow, caust * 0.6 + fr * 0.5) + spec * 1.2 + smoothstep(0.62, 0.9, caust) * 0.15 + exp(-d * 1.8) * ripple * 0.2;
          float fade = smoothstep(9.0, 3.0, length(vW.xz - vec2(0.0, -1.0)));
          gl_FragColor = vec4(c, fade * 0.95); ${CS} }`,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(22, 12, small ? 90 : 180, small ? 50 : 100), wMat); // displaced in local xy, z up
    water.rotation.x = -Math.PI / 2;
    water.position.y = -2.2;
    root.add(water);
    let flow = 1;
    let flowT = 1;
    return {
      root,
      setProgress(p) {
        flowT = 0.6 + p * 1.4;
      },
      update(t, dt) {
        flow = damp(flow, flowT, 3, dt);
        [pipeMat, flowMat, dMat, wMat].forEach((m) => (m.uniforms.uTime.value = t));
        flowMat.uniforms.uFlow.value = flow;
        dMat.uniforms.uFlow.value = flow;
        root.rotation.y = Math.sin(t * 0.2) * 0.06;
      },
    };
  },

  // ---------------------------------------------------------------- Electrical
  electrical(ctx) {
    const { THREE, small } = ctx;
    const root = new THREE.Group();
    // grid floor
    const gridMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */ `uniform float uTime; varying vec3 vW;
        void main(){ vec2 q = vW.xz * 2.0; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); float line = 1.0 - min(min(g.x, g.y), 1.0);
          vec2 Q = vW.xz * 0.5; vec2 G = abs(fract(Q - 0.5) - 0.5) / fwidth(Q); float major = 1.0 - min(min(G.x, G.y), 1.0);
          float fade = smoothstep(9.0, 1.5, length(vW.xz));
          float scan = exp(-abs(vW.z - (fract(uTime * 0.12) * 14.0 - 7.0)) * 2.5) * 0.5;
          vec3 c = vec3(0.12, 0.3, 0.75) * line * 0.45 + vec3(0.3, 0.55, 1.0) * major * 0.6 + vec3(1.0, 0.7, 0.2) * scan * (line + major);
          gl_FragColor = vec4(c, (line * 0.45 + major * 0.7 + scan * 0.3) * fade); ${CS} }`,
    });
    gridMat.side = THREE.DoubleSide;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2), gridMat);
    floor.position.y = -1.6;
    root.add(floor);
    // circuit traces (ribbons with a travelling pulse)
    const r = rng(23);
    const K = small ? 12 : 22;
    const pos = [];
    const along = [];
    const seed = [];
    const idx = [];
    const pads = [];
    const W = 0.05;
    let vi = 0;
    for (let k = 0; k < K; k++) {
      let x = Math.round((r() - 0.35) * 9) / 2;
      let z = Math.round((r() - 0.5) * 8) / 2;
      const pts = [[x, z]];
      const steps = 3 + Math.floor(r() * 4);
      let horiz = r() > 0.5;
      for (let s = 0; s < steps; s++) {
        const len = (1 + Math.floor(r() * 4)) * 0.5 * (r() > 0.5 ? 1 : -1);
        if (horiz) x += len;
        else z += len;
        horiz = !horiz;
        pts.push([x, z]);
      }
      pads.push(pts[0], pts.at(-1));
      let d = 0;
      const sd = r();
      for (let s = 0; s < pts.length - 1; s++) {
        const [ax, az] = pts[s];
        const [bx, bz] = pts[s + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const nx = -(bz - az) / len;
        const nz = (bx - ax) / len;
        pos.push(ax + nx * W, 0, az + nz * W, ax - nx * W, 0, az - nz * W, bx + nx * W, 0, bz + nz * W, bx - nx * W, 0, bz - nz * W);
        along.push(d, d, d + len, d + len);
        seed.push(sd, sd, sd, sd);
        idx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
        vi += 4;
        d += len;
      }
    }
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    tg.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    tg.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    tg.setIndex(idx);
    const traceMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uLive: { value: 0.5 } },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `attribute float aAlong; attribute float aSeed; varying float vA; varying float vS; void main(){ vA = aAlong; vS = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `uniform float uTime; uniform float uLive; varying float vA; varying float vS;
        void main(){ float live = step(vS, uLive);
          float d = fract(vA * 0.18 - uTime * (0.35 + vS * 0.3) + vS * 7.0);
          float head = pow(d, 14.0) * 2.2 + pow(d, 3.0) * 0.4;
          vec3 c = vec3(0.25, 0.45, 1.0) * 0.35 + mix(vec3(1.0, 0.75, 0.25), vec3(1.0, 1.0, 0.85), pow(d, 20.0)) * head * live;
          gl_FragColor = vec4(c, 0.45 + head * live); ${CS} }`,
    });
    const traces = new THREE.Mesh(tg, traceMat);
    traces.position.y = -1.59;
    root.add(traces);
    // pads
    const padMat = emblemMat(THREE, '#ffb020');
    padMat.uniforms.uGlow.value = 0.8;
    const padMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16), padMat, pads.length);
    const m4 = new THREE.Matrix4();
    pads.forEach(([x, z], i) => padMesh.setMatrixAt(i, m4.makeTranslation(x, -1.57, z)));
    root.add(padMesh);
    // floating core
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0.6, 0.5, 0);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), emblemMat(THREE, '#1e3a8a'));
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.95, 1)), new THREE.LineBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }));
    coreGroup.add(core, wire);
    root.add(coreGroup);
    // lightning arcs (core → pads)
    const ARCS = small ? 3 : 5;
    const SEG = 26;
    const arcs = [];
    for (let a = 0; a < ARCS; a++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SEG * 3), 3));
      const mat = new THREE.LineBasicMaterial({ color: a % 2 ? '#fff3c4' : '#9ec5ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const line = new THREE.Line(g, mat);
      line.frustumCulled = false;
      root.add(line);
      arcs.push({ line, next: 0, life: 0 });
    }
    const flash = (arc, t) => {
      const [px, pz] = pads[Math.floor(Math.random() * pads.length)];
      const from = coreGroup.position.clone();
      const to = new THREE.Vector3(px, -1.57, pz);
      const p = arc.line.geometry.attributes.position;
      for (let i = 0; i < SEG; i++) {
        const u = i / (SEG - 1);
        const v = from.clone().lerp(to, u);
        const j = Math.sin(u * Math.PI) * 0.45;
        v.x += (Math.random() - 0.5) * j;
        v.y += (Math.random() - 0.5) * j * 0.5;
        v.z += (Math.random() - 0.5) * j;
        p.setXYZ(i, v.x, v.y, v.z);
      }
      p.needsUpdate = true;
      arc.life = 0.22 + Math.random() * 0.2;
      arc.next = t + 0.3 + Math.random() * (2.4 - live * 1.8);
    };
    let live = 0.6;
    let liveT = 0.6;
    return {
      root,
      setProgress(p) {
        liveT = p;
      },
      update(t, dt) {
        live = ctx.reduce ? liveT : damp(live, liveT, 3, dt);
        gridMat.uniforms.uTime.value = t;
        traceMat.uniforms.uTime.value = t;
        traceMat.uniforms.uLive.value = live;
        coreGroup.rotation.y = t * 0.3;
        coreGroup.rotation.x = Math.sin(t * 0.4) * 0.2;
        coreGroup.position.y = 0.5 + Math.sin(t * 0.8) * 0.12;
        wire.material.opacity = 0.35 + live * 0.4 + Math.sin(t * 9) * 0.05;
        arcs.forEach((a) => {
          if (ctx.reduce && !a.life && t > 0) flash(a, t);
          if (t > a.next) flash(a, t);
          a.life = Math.max(0, a.life - dt);
          a.line.material.opacity = ctx.reduce ? 0.7 : Math.min(1, a.life * 6) * (0.6 + Math.random() * 0.4);
        });
      },
    };
  },

  // ---------------------------------------------------------------- Roofing
  roofing(ctx) {
    const { THREE, small } = ctx;
    const root = new THREE.Group();
    const flashU = { value: 0 };
    const timeU = { value: 0 };
    // house body
    const wallMat = new THREE.ShaderMaterial({
      uniforms: { uFlash: flashU, uTime: timeU },
      vertexShader: /* glsl */ `varying vec2 vU; varying vec3 vN; void main(){ vU = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `uniform float uFlash; uniform float uTime; varying vec2 vU; varying vec3 vN; ${GLSL_NOISE}
        void main(){ float lam = max(dot(normalize(vN), normalize(vec3(0.5, 0.6, 0.8))), 0.0) * 0.6 + 0.25;
          float siding = smoothstep(0.0, 0.08, fract(vU.y * 14.0)) * 0.08;
          vec2 w1 = abs(vU - vec2(0.28, 0.5)); vec2 w2 = abs(vU - vec2(0.72, 0.5));
          float win = step(max(w1.x / 0.12, w1.y / 0.16), 1.0) + step(max(w2.x / 0.12, w2.y / 0.16), 1.0);
          float flick = 0.85 + 0.15 * vnoise(vec2(uTime * 3.0, vU.x * 4.0));
          vec3 c = vec3(0.78, 0.8, 0.86) * (lam + siding) * 0.55 + uFlash * 0.5;
          c = mix(c, vec3(1.0, 0.72, 0.38) * flick * 1.3, win);
          gl_FragColor = vec4(c, 1.0); ${CS} }`,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.7, 2.3), wallMat);
    body.position.y = -0.75;
    root.add(body);
    // roof prism (custom geometry)
    const w = 1.75;
    const d = 1.4;
    const h = 1.15;
    const y0 = 0.1;
    const roofGeo = new THREE.BufferGeometry();
    // two slopes (with eaves overhang) — each quad gets uvs for shingles
    const P = [
      [-w, y0, d], [w, y0, d], [w, y0 + h, 0], [-w, y0 + h, 0], // front slope
      [w, y0, -d], [-w, y0, -d], [-w, y0 + h, 0], [w, y0 + h, 0], // back slope
    ];
    roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3));
    roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1], 2));
    roofGeo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    roofGeo.computeVertexNormals();
    const roofMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { uFlash: flashU, uTime: timeU },
      vertexShader: /* glsl */ `varying vec2 vU; varying vec3 vN; varying vec3 vW; void main(){ vU = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */ `uniform float uFlash; uniform float uTime; varying vec2 vU; varying vec3 vN; varying vec3 vW; ${GLSL_NOISE}
        void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW);
          float row = floor(vU.y * 11.0); float x = vU.x * 18.0 + mod(row, 2.0) * 0.5;
          float edgeY = fract(vU.y * 11.0); float edgeX = fract(x);
          float tile = smoothstep(0.0, 0.08, edgeY) * smoothstep(0.0, 0.05, edgeX) * smoothstep(1.0, 0.95, edgeX);
          float var = hash21(vec2(floor(x), row));
          vec3 base = mix(vec3(0.16, 0.18, 0.26), vec3(0.24, 0.22, 0.3), var) * (0.55 + 0.45 * tile);
          float lam = max(dot(n, normalize(vec3(0.3, 0.8, 0.6))), 0.0) * 0.7 + 0.3;
          float wet = fbm(vec2(x * 0.3, vU.y * 6.0 - uTime * 0.6));
          float spec = pow(max(dot(reflect(-normalize(vec3(-0.4, 0.9, 0.5)), n), v), 0.0), 30.0) * (0.4 + wet);
          vec3 c = base * lam + spec * vec3(0.6, 0.75, 1.0) + uFlash * vec3(0.55, 0.6, 0.8) * (0.4 + spec);
          gl_FragColor = vec4(c, 1.0); ${CS} }`,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    root.add(roof);
    // gables
    const gable = new THREE.BufferGeometry();
    gable.setAttribute('position', new THREE.Float32BufferAttribute([-1.5, y0, 1.15, -1.5, y0, -1.15, -1.5, y0 + h - 0.1, 0, 1.5, y0, -1.15, 1.5, y0, 1.15, 1.5, y0 + h - 0.1, 0], 3));
    gable.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1, 0, 0, 1, 0, 0.5, 1], 2));
    gable.computeVertexNormals();
    root.add(new THREE.Mesh(gable, wallMat));
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.8, 0.32), emblemMat(THREE, '#7c2d12'));
    chimney.position.set(0.9, 0.95, -0.4);
    root.add(chimney);
    // wet ground with rain spots
    const groundMat = new THREE.ShaderMaterial({
      uniforms: { uTime: timeU, uFlash: flashU },
      transparent: true,
      vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */ `uniform float uTime; uniform float uFlash; varying vec3 vW; ${GLSL_NOISE}
        void main(){ vec2 p = vW.xz * 2.5; vec2 cell = floor(p); vec2 f = fract(p) - 0.5;
          float ph = fract(uTime * 0.9 + hash21(cell)); float ring = smoothstep(0.05, 0.0, abs(length(f) - ph * 0.45)) * (1.0 - ph);
          float puddle = smoothstep(0.45, 0.7, fbm(vW.xz * 0.6));
          vec3 c = vec3(0.04, 0.06, 0.13) + puddle * vec3(0.06, 0.1, 0.2) + ring * 0.25 * (0.4 + puddle) + uFlash * 0.25 * puddle + vec3(1.0, 0.6, 0.3) * 0.06 * exp(-length(vW.xz - vec2(0.0, 1.3)) * 1.2);
          float fade = smoothstep(7.0, 2.0, length(vW.xz));
          gl_FragColor = vec4(c, fade); ${CS} }`,
    });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 64).rotateX(-Math.PI / 2), groundMat);
    ground.position.y = -1.6;
    root.add(ground);
    // clouds
    const cloudMat = new THREE.ShaderMaterial({
      uniforms: { uTime: timeU, uFlash: flashU },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `uniform float uTime; uniform float uFlash; varying vec2 vU; ${GLSL_NOISE}
        void main(){ vec2 p = vU * vec2(4.0, 2.0); float n = fbm(p + vec2(uTime * 0.04, 0.0) + fbm(p * 1.5 - uTime * 0.03));
          float mask = smoothstep(0.0, 0.6, vU.y) * smoothstep(1.0, 0.75, vU.y) * smoothstep(0.0, 0.2, vU.x) * smoothstep(1.0, 0.8, vU.x);
          vec3 c = mix(vec3(0.07, 0.09, 0.2), vec3(0.36, 0.42, 0.62), n) + uFlash * vec3(0.7, 0.75, 1.0) * n;
          gl_FragColor = vec4(c, mask * smoothstep(0.25, 0.7, n) * 0.95); ${CS} }`,
    });
    const clouds = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), cloudMat);
    clouds.position.set(0, 2.4, -5);
    root.add(clouds);
    // rain streaks
    const RN = small ? 900 : 2400;
    const rp = new Float32Array(RN * 2 * 3);
    const re = new Float32Array(RN * 2);
    const r = rng(5);
    for (let i = 0; i < RN; i++) {
      const x = (r() - 0.5) * 16;
      const y = r() * 9;
      const z = (r() - 0.5) * 8;
      rp.set([x, y, z, x, y, z], i * 6);
      re[i * 2] = 0;
      re[i * 2 + 1] = 1;
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    rg.setAttribute('aEnd', new THREE.BufferAttribute(re, 1));
    const rainMat = new THREE.ShaderMaterial({
      uniforms: { uTime: timeU, uStorm: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `attribute float aEnd; uniform float uTime; uniform float uStorm; varying float vA;
        void main(){ vec3 p = position; float sp = 7.0 + fract(p.x * 13.1) * 4.0;
          p.y = mod(p.y - uTime * sp * (0.6 + uStorm * 0.4), 9.0) - 3.2; p.x += (p.y) * -0.22 * uStorm;
          p.y += aEnd * 0.32; p.x += aEnd * -0.07 * uStorm;
          vA = (0.15 + 0.35 * aEnd) * step(fract(position.z * 7.3), 0.35 + uStorm * 0.65);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader: /* glsl */ `varying float vA; void main(){ gl_FragColor = vec4(vec3(0.65, 0.78, 1.0) * vA, vA); ${CS} }`,
    });
    const rain = new THREE.LineSegments(rg, rainMat);
    rain.frustumCulled = false;
    root.add(rain);
    // lightning bolt
    const BS = 18;
    const boltG = new THREE.BufferGeometry();
    boltG.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BS * 3), 3));
    const bolt = new THREE.Line(boltG, new THREE.LineBasicMaterial({ color: '#e0e7ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
    bolt.frustumCulled = false;
    root.add(bolt);
    let nextFlash = 1.2;
    let flash = 0;
    let storm = 1;
    let stormT = 1;
    const strike = () => {
      const x0 = (Math.random() - 0.5) * 8;
      const p = boltG.attributes.position;
      let x = x0;
      for (let i = 0; i < BS; i++) {
        x += (Math.random() - 0.5) * 0.5;
        p.setXYZ(i, x, 3.4 - (i / (BS - 1)) * 5, -3.5);
      }
      p.needsUpdate = true;
      flash = 1;
    };
    return {
      root,
      setProgress(p) {
        stormT = 0.35 + p * 0.65;
      },
      update(t, dt) {
        storm = damp(storm, stormT, 2, dt);
        timeU.value = t;
        rainMat.uniforms.uStorm.value = storm;
        if (ctx.reduce) flash = 0.15;
        else if (t > nextFlash) {
          strike();
          nextFlash = t + 2.5 + Math.random() * 4 / storm;
        }
        flash = Math.max(0, flash - dt * 3.2);
        const f = flash * (0.6 + 0.4 * Math.sin(t * 60));
        flashU.value = Math.max(0, f);
        bolt.material.opacity = flash > 0.5 ? 1 : flash;
        root.rotation.y = -0.5 + Math.sin(t * 0.15) * 0.08;
      },
    };
  },

  // ---------------------------------------------------------------- Cleaning
  cleaning(ctx) {
    const { THREE, small } = ctx;
    const root = new THREE.Group();
    const N = small ? 12 : 22;
    const bMat = bubbleMat(THREE);
    const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, small ? 32 : 48, small ? 20 : 32), bMat, N);
    const r = rng(31);
    const data = Array.from({ length: N }, (_, i) => ({ x: (r() - 0.5) * 9, y: (r() - 0.5) * 6, z: (r() - 0.5) * 4 - 0.5, s: i === 0 ? 1.35 : 0.18 + r() * 0.7, sp: 0.15 + r() * 0.3, ph: r() * 6.28 }));
    data[0].x = 0;
    data[0].y = 0.2;
    data[0].z = 0;
    data[0].sp = 0;
    root.add(bubbles);
    // sparkles
    const SN = small ? 500 : 1300;
    const sp = new Float32Array(SN * 3);
    const ss = new Float32Array(SN);
    for (let i = 0; i < SN; i++) {
      sp.set([(r() - 0.5) * 14, (r() - 0.5) * 8, (r() - 0.5) * 5], i * 3);
      ss[i] = r();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
    const sMat = pointsMat(THREE, {
      uniforms: { uSweep: { value: -8 }, uBoost: { value: 1 } },
      vs: /* glsl */ `attribute float aSeed; uniform float uTime; uniform float uPR; uniform float uSweep; uniform float uBoost; varying vec3 vC; varying float vA;
        void main(){ vec4 wp = modelMatrix * vec4(position, 1.0);
          float tw = pow(0.5 + 0.5 * sin(uTime * (2.0 + aSeed * 4.0) + aSeed * 40.0), 6.0);
          float sweep = exp(-abs(wp.x - uSweep) * 1.4);
          vA = (tw * 0.6 + sweep * 1.4) * uBoost; vC = mix(vec3(0.6, 1.0, 0.95), vec3(1.0), sweep);
          vec4 mv = viewMatrix * wp; gl_PointSize = (4.0 + aSeed * 9.0) * (0.5 + sweep) * uPR * (6.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fs: /* glsl */ `varying vec3 vC; varying float vA;
        void main(){ vec2 d = abs(gl_PointCoord - 0.5); float star = max(smoothstep(0.08, 0.0, d.x) * smoothstep(0.5, 0.0, d.y), smoothstep(0.08, 0.0, d.y) * smoothstep(0.5, 0.0, d.x));
          float core = smoothstep(0.25, 0.0, length(d)); float a = (star + core) * vA; gl_FragColor = vec4(vC * a, a); ${CS} }`,
    });
    const sparkles = new THREE.Points(sg, sMat);
    sparkles.frustumCulled = false;
    root.add(sparkles);
    // glossy floor with squeegee sweep band
    const floorMat = new THREE.ShaderMaterial({
      uniforms: { uSweep: sMat.uniforms.uSweep, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */ `uniform float uSweep; uniform float uTime; varying vec3 vW; ${GLSL_NOISE}
        void main(){ float band = exp(-abs(vW.x - uSweep) * 3.0); float clean = smoothstep(uSweep + 0.2, uSweep - 0.4, vW.x);
          float dirt = fbm(vW.xz * 1.4) * (1.0 - clean) * 0.25;
          vec3 c = vec3(0.04, 0.1, 0.16) + vec3(0.1, 0.5, 0.48) * clean * 0.3 + band * vec3(0.7, 1.0, 0.95) * 0.8 + dirt;
          float fade = smoothstep(8.0, 2.0, length(vW.xz));
          gl_FragColor = vec4(c, fade * (0.75 + band * 0.25)); ${CS} }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 10).rotateX(-Math.PI / 2), floorMat);
    floor.position.y = -2.2;
    root.add(floor);
    const m4 = new THREE.Matrix4();
    const qn = new THREE.Quaternion();
    const v3 = new THREE.Vector3();
    const sc = new THREE.Vector3();
    let boost = 1;
    let boostT = 1;
    return {
      root,
      setProgress(p) {
        boostT = 0.6 + p * 0.9;
      },
      update(t, dt) {
        boost = damp(boost, boostT, 3, dt);
        bMat.uniforms.uTime.value = t;
        sMat.uniforms.uTime.value = t;
        sMat.uniforms.uBoost.value = boost;
        floorMat.uniforms.uTime.value = t;
        sMat.uniforms.uSweep.value = ((t * 0.9) % 14) - 7;
        data.forEach((b, i) => {
          const y = i === 0 ? b.y + Math.sin(t * 0.7) * 0.15 : ((b.y + t * b.sp + 3.5) % 7) - 3.5;
          const wob = Math.sin(t * 2.2 + b.ph) * 0.04;
          v3.set(b.x + Math.sin(t * 0.5 + b.ph) * 0.3, y, b.z);
          sc.set(b.s * (1 + wob), b.s * (1 - wob), b.s);
          qn.setFromAxisAngle(v3.clone().normalize(), t * 0.2 + b.ph);
          bubbles.setMatrixAt(i, m4.compose(v3, qn, sc));
        });
        bubbles.instanceMatrix.needsUpdate = true;
      },
    };
  },

  // ---------------------------------------------------------------- Hub: orbiting selector
  hub(ctx, opts) {
    const { THREE, small } = ctx;
    const root = new THREE.Group();
    const order = ['hvac', 'plumbing', 'electrical', 'roofing', 'cleaning'];
    const emblems = [];
    const make = (slug) => {
      const g = new THREE.Group();
      const c = IND_COLORS[slug];
      if (slug === 'hvac') {
        const m = emblemMat(THREE, c);
        g.add(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.11, 20, 80), m));
        const flake = new THREE.Group();
        for (let k = 0; k < 3; k++) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.06), m);
          bar.rotation.z = (k * Math.PI) / 3;
          flake.add(bar);
        }
        g.add(flake);
        g.userData.mats = [m];
      } else if (slug === 'plumbing') {
        const pts = [];
        for (let i = 0; i <= 24; i++) {
          const u = i / 24;
          const y = 0.75 - u * 1.3;
          const rr = u < 0.55 ? Math.sin((u / 0.55) * Math.PI * 0.5) * 0.42 * u * 1.5 : Math.sqrt(Math.max(0, 1 - ((u - 0.55) / 0.45) ** 2)) * 0.5;
          pts.push(new THREE.Vector2(Math.max(0.001, rr), y));
        }
        const m = emblemMat(THREE, c);
        g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), m));
        g.userData.mats = [m];
      } else if (slug === 'electrical') {
        const s = new THREE.Shape();
        [[0.12, 0.7], [-0.35, -0.05], [-0.02, -0.05], [-0.15, -0.7], [0.35, 0.1], [0.04, 0.1], [0.2, 0.7]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
        const m = emblemMat(THREE, c);
        const geo = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
        geo.center();
        g.add(new THREE.Mesh(geo, m));
        g.userData.mats = [m];
      } else if (slug === 'roofing') {
        const s = new THREE.Shape();
        [[-0.5, -0.45], [0.5, -0.45], [0.5, 0.1], [0.62, 0.1], [0, 0.62], [-0.62, 0.1], [-0.5, 0.1]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
        const door = new THREE.Path();
        [[-0.1, -0.45], [-0.1, -0.12], [0.1, -0.12], [0.1, -0.45]].forEach(([x, y], i) => (i ? door.lineTo(x, y) : door.moveTo(x, y)));
        s.holes.push(door);
        const m = emblemMat(THREE, c);
        const geo = new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 });
        geo.center();
        g.add(new THREE.Mesh(geo, m));
        g.userData.mats = [m];
      } else {
        const bm = bubbleMat(THREE);
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 40, 28), bm));
        const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), bm);
        s2.position.set(0.55, 0.45, 0.1);
        g.add(s2);
        g.userData.bubble = bm;
        g.userData.mats = [];
      }
      g.userData.slug = slug;
      return g;
    };
    const orbit = new THREE.Group();
    root.add(orbit);
    order.forEach((slug, i) => {
      const e = make(slug);
      e.userData.i = i;
      // invisible hit sphere for easy picking
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.i = i;
      e.add(hit);
      e.userData.hit = hit;
      orbit.add(e);
      emblems.push(e);
    });
    // orbit rings
    const ringMat = new THREE.MeshBasicMaterial({ color: '#5b8cff', transparent: true, opacity: 0.22 });
    const RX = 3.1;
    const RZ = 2.1;
    const ellipse = new THREE.EllipseCurve(0, 0, RX, RZ, 0, Math.PI * 2);
    const ePts = ellipse.getPoints(160).map((p) => new THREE.Vector3(p.x, 0, p.y));
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ePts), new THREE.LineBasicMaterial({ color: '#7aa2ff', transparent: true, opacity: 0.35 }));
    root.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.008, 6, 120), ringMat);
    ring2.rotation.x = Math.PI / 2.2;
    root.add(ring2);
    // core: glowing orb of points
    const CN = small ? 700 : 1600;
    const cp = new Float32Array(CN * 3);
    const cs = new Float32Array(CN);
    const r = rng(3);
    for (let i = 0; i < CN; i++) {
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const rad = 0.55 + r() * 0.12;
      cp.set([Math.sqrt(1 - u * u) * Math.cos(th) * rad, u * rad, Math.sqrt(1 - u * u) * Math.sin(th) * rad], i * 3);
      cs[i] = r();
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.BufferAttribute(cp, 3));
    cg.setAttribute('aSeed', new THREE.BufferAttribute(cs, 1));
    const coreMat = pointsMat(THREE, {
      uniforms: { uColor: { value: raw(THREE, IND_COLORS.hvac) } },
      vs: /* glsl */ `attribute float aSeed; uniform float uTime; uniform float uPR; uniform vec3 uColor; varying vec3 vC; varying float vA;
        void main(){ vec3 p = position * (1.0 + 0.08 * sin(uTime * 2.0 + aSeed * 30.0)); vC = mix(uColor, vec3(1.0), aSeed * 0.5); vA = 0.5 + 0.5 * sin(uTime * 3.0 + aSeed * 50.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (2.0 + aSeed * 4.0) * uPR * (6.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    });
    const core = new THREE.Points(cg, coreMat);
    root.add(core);
    // starfield
    const SN = small ? 500 : 1200;
    const sp = new Float32Array(SN * 3);
    const ss = new Float32Array(SN);
    for (let i = 0; i < SN; i++) {
      sp.set([(r() - 0.5) * 30, (r() - 0.5) * 16, -3 - r() * 10], i * 3);
      ss[i] = r();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aSeed', new THREE.BufferAttribute(ss, 1));
    const starMat = pointsMat(THREE, {
      vs: /* glsl */ `attribute float aSeed; uniform float uTime; uniform float uPR; varying vec3 vC; varying float vA;
        void main(){ vC = vec3(0.7, 0.8, 1.0); vA = 0.25 + 0.5 * pow(0.5 + 0.5 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 90.0), 4.0);
          vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = (1.5 + aSeed * 2.5) * uPR; gl_Position = projectionMatrix * mv; }`,
    });
    const stars = new THREE.Points(sg, starMat);
    stars.frustumCulled = false;
    ctx.scene.add(stars);

    let active = 0;
    let angle = 0;
    let hover = -1;
    const raycaster = new THREE.Raycaster();
    const hits = emblems.map((e) => e.userData.hit);
    const colorTarget = raw(THREE, IND_COLORS.hvac);
    const pick = (ndc) => {
      raycaster.setFromCamera(ndc, ctx.camera);
      const h = raycaster.intersectObjects(hits, false)[0];
      return h ? h.object.userData.i : -1;
    };
    const canvas = ctx.canvas;
    const toNdc = (e) => {
      const rc = canvas.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -(((e.clientY - rc.top) / rc.height) * 2 - 1));
    };
    canvas.addEventListener('pointermove', (e) => {
      hover = pick(toNdc(e));
      canvas.style.cursor = hover >= 0 ? 'pointer' : '';
    });
    canvas.addEventListener('pointerleave', () => (hover = -1));
    canvas.addEventListener('click', (e) => {
      const i = pick(toNdc(e));
      if (i >= 0) opts.onPick?.(i);
    });
    return {
      root,
      setActive(i) {
        active = i;
        colorTarget.setStyle(IND_COLORS[order[i]], THREE.LinearSRGBColorSpace);
      },
      projectActive() {
        const v = new THREE.Vector3();
        emblems[active].getWorldPosition(v);
        v.project(ctx.camera);
        return v;
      },
      update(t, dt) {
        const target = (-active / emblems.length) * Math.PI * 2;
        // shortest path
        let diff = target - angle;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        angle = ctx.reduce ? target : angle + diff * (1 - Math.exp(-4 * dt));
        emblems.forEach((e, i) => {
          const a = angle + (i / emblems.length) * Math.PI * 2 + Math.PI / 2;
          e.position.set(Math.cos(a) * RX, Math.sin(t * 0.8 + i) * 0.12, Math.sin(a) * RZ);
          const isA = i === active;
          const isH = i === hover;
          const s = damp(e.scale.x || 1, isA ? 1.45 : isH ? 1.15 : 0.85, 6, dt || 1);
          e.scale.setScalar(s);
          e.rotation.y = t * (isA ? 0.9 : 0.35) + i;
          e.rotation.x = Math.sin(t * 0.5 + i) * 0.25;
          const depth = (e.position.z + RZ) / (2 * RZ);
          (e.userData.mats || []).forEach((m) => {
            m.uniforms.uGlow.value = damp(m.uniforms.uGlow.value, isA ? 1.2 : isH ? 0.8 : 0.25, 6, dt || 1);
            m.uniforms.uDim.value = 0.45 + depth * 0.55;
          });
          if (e.userData.bubble) {
            e.userData.bubble.uniforms.uTime.value = t;
            e.userData.bubble.uniforms.uAlpha.value = 0.5 + depth * 0.5;
          }
        });
        coreMat.uniforms.uColor.value.lerp(colorTarget, 1 - Math.exp(-4 * (dt || 1)));
        coreMat.uniforms.uTime.value = t;
        starMat.uniforms.uTime.value = t;
        core.rotation.y = t * 0.2;
        ring2.rotation.z = t * 0.1;
      },
    };
  },
};

// =====================================================================================================================
export function mountIndustryScene(el, { variant = 'hvac', onPick } = {}) {
  let inner = null;
  let scroll = 0;
  const stage = glStage(
    el,
    (ctx) => {
      const { THREE } = ctx;
      inner = VARIANTS[variant](ctx, { onPick });
      ctx.scene.add(inner.root);
      const pr = Math.min(devicePixelRatio || 1, ctx.small ? 1.5 : 2);
      ctx.scene.traverse((o) => o.material?.uniforms?.uPR && (o.material.uniforms.uPR.value = pr));
      // HUD-ish volumetric dust everywhere (cheap)
      const DN = ctx.small ? 250 : 600;
      const dp = new Float32Array(DN * 3);
      const r = rng(99);
      for (let i = 0; i < DN; i++) dp.set([(r() - 0.5) * 20, (r() - 0.5) * 12, (r() - 0.5) * 8], i * 3);
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#8fb3ff', size: 0.025, transparent: true, opacity: 0.45, depthWrite: false }));
      ctx.scene.add(dust);
      const cam = ctx.camera;
      const base = { hvac: [0, 0.4, 10.5], plumbing: [0, 0.8, 10], electrical: [0, 2.7, 9.8], roofing: [0, 1.3, 9.6], cleaning: [0, 0.2, 9.6], hub: [0, 2.2, 9.6] }[variant];
      const look = { hvac: [0, 0, 0], plumbing: [0, 0.2, -1], electrical: [0, -0.4, 0], roofing: [0, 0, 0], cleaning: [0, -0.2, 0], hub: [0, 0, 0] }[variant];
      const frame = { hvac: [0.74, 3.05], plumbing: [0.8, 2.4], electrical: [0.78, 2.7], roofing: [0.82, 2.9], cleaning: [0.85, 2.7], hub: [0.86, 2.7] }[variant];
      let px = 0;
      let wide = true;
      return {
        resize(w, h) {
          wide = w / h > 1.15;
        },
        update(t, dt, c) {
          inner.update(t, dt, c);
          dust.rotation.y = t * 0.02;
          // two-act scroll journey: object sits right of the copy, then glides left to make room for the widget card
          const act = Math.min(1, Math.max(0, (scroll - 0.12) / 0.45));
          const e = act * act * (3 - 2 * act);
          const xA = wide ? frame[1] : 0;
          const xB = wide ? -frame[1] : 0;
          px = xA + (xB - xA) * e;
          const yOff = wide ? 0 : 1.7 - e * 0.6;
          const s = wide ? frame[0] : frame[0] * 0.66;
          inner.root.position.set(px, yOff, 0);
          inner.root.scale.setScalar(s);
          const p = c.pointer;
          cam.position.set(base[0] + p.x * 0.6 + e * (wide ? -0.6 : 0), base[1] + p.y * 0.35 + e * 0.4, base[2] - e * 0.8);
          cam.lookAt(look[0] + px * 0.35, look[1] + yOff * 0.5, look[2]);
        },
        dispose() {},
      };
    },
    { fov: 35, interactive: variant === 'hub', className: `gl-ind gl-ind--${variant}`, rootMargin: '0px' },
  );
  return stage.then((s) =>
    s
      ? {
          setProgress(p, extra) {
            inner?.setProgress?.(p, extra);
            s.invalidate();
          },
          setScroll(p) {
            scroll = p;
            s.invalidate();
          },
          setActive(i) {
            inner?.setActive?.(i);
            s.invalidate();
          },
          destroy: () => s.destroy(),
        }
      : null,
  );
}
