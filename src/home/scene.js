import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildLogo, buildParticles } from '../shared/brand3d.js';

// Ashima Arts 3D simplex noise (MIT) — https://github.com/ashima/webgl-noise
const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const orbVertex = /* glsl */ `
${SIMPLEX}
uniform float uTime, uAmp, uFreq, uSpeed, uMouseStrength, uPulse;
uniform vec3 uMouseDir;
varying vec3 vNormalV, vViewDir, vPos;
varying float vNoise;

float displacement(vec3 p) {
  float n = snoise(p * uFreq + uTime * uSpeed);
  n += 0.22 * snoise(p * uFreq * 2.1 - uTime * uSpeed * 1.3);
  // Bulge toward the cursor
  float facing = smoothstep(0.55, 1.0, dot(normalize(p), uMouseDir));
  // Ripple travelling over the surface after a click
  float ripple = sin(dot(normalize(p), uMouseDir) * 14.0 - uPulse * 18.0) * uPulse * (1.0 - uPulse);
  return n * uAmp + facing * uMouseStrength + ripple * 0.35;
}

void main() {
  float d = displacement(position);
  vec3 displaced = position + normal * d;
  // Recompute the normal from two neighbouring displaced points
  vec3 t = normalize(cross(normal, vec3(0.0, 1.0, 0.001)));
  vec3 b = normalize(cross(normal, t));
  float e = 0.01;
  vec3 pt = position + t * e; vec3 pb = position + b * e;
  vec3 dt = pt + normalize(pt) * displacement(pt);
  vec3 db = pb + normalize(pb) * displacement(pb);
  vec3 n = normalize(cross(dt - displaced, db - displaced));
  if (dot(n, normal) < 0.0) n = -n;

  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  vNormalV = normalize(normalMatrix * n);
  vViewDir = normalize(-mv.xyz);
  vPos = displaced;
  vNoise = d;
  gl_Position = projectionMatrix * mv;
}`;

const orbFragment = /* glsl */ `
uniform vec3 uColorA, uColorB, uRim;
uniform float uOpacity, uTime;
varying vec3 vNormalV, vViewDir, vPos;
varying float vNoise;

void main() {
  float fresnel = pow(1.0 - max(dot(vNormalV, vViewDir), 0.0), 2.4);
  float grad = smoothstep(-1.4, 1.6, vPos.y * 0.7 + vPos.x * 0.35 + vNoise * 1.6);
  vec3 col = mix(uColorA, uColorB, grad);
  // Thin iridescent bands that slide over the surface
  col += 0.06 * sin(vNoise * 22.0 + uTime * 0.8) * uRim;
  // Soft key light from the top-right
  float light = max(dot(vNormalV, normalize(vec3(0.5, 0.7, 0.6))), 0.0);
  col += pow(light, 18.0) * 0.55;
  col = mix(col, uRim, fresnel * 0.85);
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}`;

/** Palettes the orb morphs to while hovering each service (index matches the service list). */
export const PALETTES = [
  { a: '#14173d', b: '#0396c7', rim: '#9be7ff' }, // default brand
  { a: '#1b1150', b: '#6b5cff', rim: '#c9c2ff' }, // strategy
  { a: '#0c2a3d', b: '#00b3a4', rim: '#9fffe9' }, // content
  { a: '#131a4a', b: '#2a6fdb', rim: '#a8d0ff' }, // performance
  { a: '#2a0f3d', b: '#d0459b', rim: '#ffc2e6' }, // branding
  { a: '#0b2440', b: '#16b0e8', rim: '#c4f1ff' }, // web
];

export function createHomeScene(canvas, { lowPower = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // Environment + lights are only used by the extruded logo (the orb is fully custom-shaded)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  const key = new THREE.DirectionalLight('#7fd8ff', 1.4);
  key.position.set(3, 4, 5);
  scene.add(key, new THREE.AmbientLight('#ffffff', 0.25));

  // ---- Orb ----
  const p = PALETTES[0];
  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.16 },
    uFreq: { value: 0.75 },
    uSpeed: { value: 0.22 },
    uMouseStrength: { value: 0 },
    uMouseDir: { value: new THREE.Vector3(0, 0, 1) },
    uPulse: { value: 0 },
    uOpacity: { value: 1 },
    uColorA: { value: new THREE.Color(p.a) },
    uColorB: { value: new THREE.Color(p.b) },
    uRim: { value: new THREE.Color(p.rim) },
  };
  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.55, lowPower ? 40 : 72),
    new THREE.ShaderMaterial({ uniforms, vertexShader: orbVertex, fragmentShader: orbFragment, transparent: true }),
  );
  const orbGroup = new THREE.Group();
  orbGroup.add(orb);
  scene.add(orbGroup);

  // Soft halo behind the orb
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: uniforms.uColorB, uOpacity: uniforms.uOpacity },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      // #include must sit on its own line for the GLSL preprocessor
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float d = distance(vUv, vec2(0.5));
          gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * 0.35 * uOpacity);
          #include <colorspace_fragment>
        }`,
    }),
  );
  halo.position.z = -2;
  orbGroup.add(halo);

  // ---- Particles ----
  const particles = buildParticles(lowPower ? 900 : 1800);
  scene.add(particles);

  // ---- Isologo (shown next to the contact form) ----
  const logoPivot = new THREE.Group();
  scene.add(logoPivot);
  let logo = null;
  const ready = fetch('/brand/isologo-gradient.svg')
    .then((r) => r.text())
    .then((svg) => {
      logo = buildLogo(svg);
      logoPivot.add(logo);
    })
    .catch(() => {}); // the orb still works without the logo

  // ---- State animated from main.js (GSAP / ScrollTrigger) ----
  const state = {
    orb: { x: 0, y: 0, scale: 1, opacity: 1 },
    logo: { x: 0, y: 0, scale: 0.6, opacity: 0, rotY: 0 },
    velocity: 0,
  };

  const mouse = new THREE.Vector2();
  const smooth = new THREE.Vector2();
  let mouseActive = 0;
  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    mouseActive = 1;
  });
  document.addEventListener('pointerleave', () => (mouseActive = 0));

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  const timer = new THREE.Timer();
  timer.connect(document); // ignores time spent in a hidden tab
  const worldMouse = new THREE.Vector3();
  const inv = new THREE.Quaternion();
  let running = true;

  renderer.setAnimationLoop(() => {
    if (!running) return;
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    smooth.lerp(mouse, 0.07);
    uniforms.uTime.value = t;

    // Orb transform + idle motion
    const o = state.orb;
    orbGroup.position.set(o.x + smooth.x * 0.15, o.y + Math.sin(t * 0.8) * 0.06 + smooth.y * 0.1, 0);
    orbGroup.scale.setScalar(o.scale);
    orb.rotation.y += dt * 0.12;
    orb.rotation.x = smooth.y * 0.25;
    uniforms.uOpacity.value = o.opacity;
    orbGroup.visible = o.opacity > 0.01;

    // Scroll velocity makes the surface more agitated
    const targetAmp = 0.16 + Math.min(Math.abs(state.velocity) * 0.01, 0.28);
    uniforms.uAmp.value += (targetAmp - uniforms.uAmp.value) * 0.06;

    // Cursor direction expressed in the orb's local space -> bulge in the shader
    worldMouse.set(smooth.x * 2.2 - o.x * 0.35, smooth.y * 2.2 - o.y * 0.35, 1.6).normalize();
    inv.copy(orb.quaternion).invert();
    uniforms.uMouseDir.value.copy(worldMouse).applyQuaternion(inv);
    uniforms.uMouseStrength.value += ((mouseActive ? 0.28 : 0) - uniforms.uMouseStrength.value) * 0.05;

    // Logo
    const l = state.logo;
    if (logo) {
      logo.material.opacity = l.opacity;
      logoPivot.visible = l.opacity > 0.01;
      logoPivot.position.set(l.x, l.y + Math.sin(t * 1.1) * 0.08, 0);
      logoPivot.scale.setScalar(l.scale);
      logoPivot.rotation.y = l.rotY + smooth.x * 0.5 + Math.sin(t * 0.6) * 0.15;
      logoPivot.rotation.x = -smooth.y * 0.3;
    }

    particles.rotation.y = t * 0.025 + smooth.x * 0.08;
    particles.material.uniforms.uTime.value = t;
    renderer.render(scene, camera);
  });

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
  });

  return { state, uniforms, ready, palettes: PALETTES };
}

