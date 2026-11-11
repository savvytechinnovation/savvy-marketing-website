// 404 playground: extruded "4 0 4" digits on springs (push them with the pointer, tap to make them
// jump) in front of a particle black hole whose event horizon sits inside the zero.
// Lazy three.js, pauses off-screen / hidden tab, reduced motion = one still frame.
import { gsap } from '../../ds/site.js';

const BRAND = { navy: '#14173D', cyan: '#0396C7', primary: '#0792C2', dark: '#293BAA', accent: '#FF5527', bg: '#070b1f' };

export async function mount404(el, { reduce = false } = {}) {
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

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
  el.append(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 14);
  scene.add(new THREE.HemisphereLight('#dff4ff', BRAND.navy, 1.2));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.PointLight(BRAND.accent, 60, 20);
  rim.position.set(0, 0, -2);
  scene.add(rim);

  // ---- digits
  const four = () => {
    const s = new THREE.Shape();
    [[1.0, 0], [1.42, 0], [1.42, 0.55], [1.8, 0.55], [1.8, 0.97], [1.42, 0.97], [1.42, 2.4], [0.98, 2.4], [0, 0.97], [0, 0.55], [1.0, 0.55]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    const h = new THREE.Path();
    h.moveTo(1.0, 0.97);
    h.lineTo(0.53, 0.97);
    h.lineTo(1.0, 1.72);
    h.closePath();
    s.holes.push(h);
    return s;
  };
  const stadium = (w, hgt, cx, cy) => {
    const p = new THREE.Path();
    const r = w / 2;
    p.absarc(cx, cy + hgt / 2 - r, r, 0, Math.PI, false);
    p.absarc(cx, cy - hgt / 2 + r, r, Math.PI, Math.PI * 2, false);
    p.closePath();
    return p;
  };
  const zero = () => {
    const s = new THREE.Shape();
    const o = stadium(1.8, 2.4, 0.9, 1.2);
    s.setFromPoints(o.getPoints(48));
    const hole = new THREE.Path();
    hole.setFromPoints(stadium(0.96, 1.56, 0.9, 1.2).getPoints(48).reverse());
    s.holes.push(hole);
    return s;
  };
  const extrude = { depth: 0.55, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.07, bevelSegments: 5, curveSegments: 24 };
  const mkDigit = (shape) => {
    const geo = new THREE.ExtrudeGeometry(shape, extrude);
    geo.center();
    geo.computeBoundingBox();
    const { min, max } = geo.boundingBox;
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const a = new THREE.Color(BRAND.navy), b = new THREE.Color(BRAND.cyan);
    for (let i = 0; i < pos.count; i++) {
      const t = ((pos.getX(i) - min.x) / (max.x - min.x)) * 0.4 + ((pos.getY(i) - min.y) / (max.y - min.y)) * 0.6;
      c.copy(a).lerp(b, THREE.MathUtils.clamp(t, 0, 1));
      cols.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06 }));
  };
  const digits = [mkDigit(four()), mkDigit(zero()), mkDigit(four())];
  const stage = new THREE.Group();
  scene.add(stage);
  const bodies = digits.map((m, i) => {
    const g = new THREE.Group();
    g.add(m);
    g.position.x = (i - 1) * 2.35;
    stage.add(g);
    return { g, mesh: m, home: g.position.clone(), p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3(), phase: i * 1.7 };
  });

  // ---- black hole behind the zero: event horizon + accretion disk particles
  const hole = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: { uRim: { value: new THREE.Color(BRAND.accent) } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 uRim; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 3.0); gl_FragColor = vec4(uRim * f * 2.2, 1.0); }',
    }),
  );
  hole.position.z = -1.2;
  stage.add(hole);

  const n = mobile ? 5000 : 12000;
  const geo = new THREE.BufferGeometry();
  const seed = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) seed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
  const diskMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uPull: { value: 0 }, uHot: { value: new THREE.Color('#ffd2b8') }, uWarm: { value: new THREE.Color(BRAND.accent) }, uCool: { value: new THREE.Color(BRAND.cyan) }, uDeep: { value: new THREE.Color(BRAND.dark) } },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed; uniform float uTime, uPR, uPull; varying vec3 vC; varying float vA;
      uniform vec3 uHot, uWarm, uCool, uDeep;
      void main(){
        float life = fract(aSeed.x + uTime * (0.025 + aSeed.w * 0.03) * (1.0 + uPull * 3.0));
        float r = mix(9.0, 0.7, pow(life, 0.8));
        float ang = aSeed.y * 6.2831 + uTime * 0.6 / pow(r, 1.2) * 3.0 + life * 6.0;
        float thick = (aSeed.z - 0.5) * 0.5 * (r / 9.0) * (1.0 + uPull);
        vec3 p = vec3(cos(ang) * r, thick + sin(ang) * r * 0.32, sin(ang) * r * 0.9 - 1.2);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float k = smoothstep(9.0, 0.8, r);
        vC = mix(mix(uDeep, uCool, smoothstep(0.0, 0.5, k)), mix(uWarm, uHot, smoothstep(0.85, 1.0, k)), smoothstep(0.55, 0.9, k));
        vA = smoothstep(0.0, 0.08, life) * smoothstep(1.0, 0.92, life);
        gl_PointSize = (1.6 + k * 2.6) * uPR * (12.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, smoothstep(0.5, 0.0, d) * vA * 1.3); }`,
  });
  const disk = new THREE.Points(geo, diskMat);
  stage.add(disk);

  // ---- interaction: springs + pointer impulses
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9), lastNdc = new THREE.Vector2(9, 9);
  const pointer = new THREE.Vector2();
  const hit = () => {
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(digits, false)[0];
    return h ? bodies.find((b) => b.mesh === h.object) : null;
  };
  const onMove = (e) => {
    const r = el.getBoundingClientRect();
    lastNdc.copy(ndc);
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    pointer.copy(ndc);
    const b = hit();
    if (b && lastNdc.x < 5) {
      const dx = ndc.x - lastNdc.x, dy = ndc.y - lastNdc.y;
      b.v.x += dx * 18;
      b.v.y += dy * 18;
      b.w.y += dx * 22;
      b.w.x -= dy * 22;
    }
  };
  const kick = (b, s = 1) => {
    b.v.y += 7 * s;
    b.v.z += 3 * s;
    b.w.z += (Math.random() - 0.5) * 14 * s;
    b.w.x += 6 * s;
  };
  const onDown = (e) => {
    onMove(e);
    const b = hit();
    if (b) kick(b, 1.2);
    else bodies.forEach((x, i) => setTimeout(() => kick(x, 0.6), i * 70));
    gsap.fromTo(diskMat.uniforms.uPull, { value: 1 }, { value: 0, duration: 1.6, ease: 'expo.out' });
  };
  if (!reduce) {
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerdown', onDown);
  }

  // ---- layout + loop
  const layout = () => {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const narrow = w / h < 1;
    stage.scale.setScalar(narrow ? 0.62 : 1);
    stage.position.set(narrow ? 0 : 2.2, narrow ? 1.3 : 0.5, 0);
  };
  const ro = new ResizeObserver(layout);
  ro.observe(el);
  layout();

  let t = 0, last = performance.now();
  const K = 38, D = 5.5;
  const frame = (dt) => {
    t += dt;
    for (const b of bodies) {
      // spring back home (position + rotation), damped
      b.v.addScaledVector(b.p, -K * dt).multiplyScalar(Math.max(0, 1 - D * dt));
      b.w.addScaledVector(b.r, -K * dt).multiplyScalar(Math.max(0, 1 - D * dt));
      b.p.addScaledVector(b.v, dt);
      b.r.addScaledVector(b.w, dt);
      b.g.position.set(b.home.x + b.p.x, b.home.y + b.p.y + Math.sin(t * 1.2 + b.phase) * 0.08, b.home.z + b.p.z);
      b.g.rotation.set(b.r.x + Math.sin(t * 0.7 + b.phase) * 0.05, b.r.y + pointer.x * 0.25, b.r.z);
    }
    stage.rotation.y = pointer.x * 0.12;
    stage.rotation.x = -pointer.y * 0.08;
    diskMat.uniforms.uTime.value = t;
    renderer.render(scene, camera);
  };
  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(el);
  const tick = () => {
    const now = performance.now();
    const dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    if (visible && !document.hidden) frame(dt);
  };
  if (reduce) {
    t = 4;
    frame(0);
    new ResizeObserver(() => frame(0)).observe(el);
  } else {
    gsap.ticker.add(tick);
    // entrance: digits drop in with a bounce
    bodies.forEach((b, i) => {
      b.p.y = 6 + i;
      b.r.z = (i - 1) * 0.8;
    });
  }
  gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1 });
  el.classList.add('has-3d');

  return {
    kick: () => bodies.forEach((b, i) => setTimeout(() => kick(b, 0.8), i * 90)),
    destroy() {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      scene.traverse((o) => {
        o.geometry?.dispose();
        [].concat(o.material || []).forEach((m) => m.dispose());
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}
