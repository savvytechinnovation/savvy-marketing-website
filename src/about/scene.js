import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Brand gradient stops (from the Figma logo: #14173D -> #0396C7)
const NAVY = new THREE.Color('#14173D');
const CYAN = new THREE.Color('#0396C7');

/**
 * Fixed full-screen WebGL scene: the Savvy isologo extruded in 3D,
 * floating inside a particle field. Exposes a `state` object that
 * GSAP/ScrollTrigger animates (position, rotation, scale, opacity).
 */
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;

  const key = new THREE.DirectionalLight('#7fd8ff', 1.4);
  key.position.set(3, 4, 5);
  const rim = new THREE.PointLight('#0396C7', 30, 20);
  rim.position.set(-4, -2, -2);
  scene.add(key, rim, new THREE.AmbientLight('#ffffff', 0.25));

  // ---- Isologo mesh, built from the exact Figma SVG path ----
  const pivot = new THREE.Group();
  scene.add(pivot);
  let logo = null;
  const ready = fetch('/brand/isologo-gradient.svg')
    .then((res) => res.text())
    .then((svg) => {
      logo = buildLogo(svg);
      pivot.add(logo);
    });

  // ---- Particle field ----
  const particles = buildParticles(1800);
  scene.add(particles);

  // Animated by GSAP from main.js
  const state = { x: 0, y: 0, z: 0, rotY: 0, rotX: 0, scale: 1, opacity: 1, spin: 1 };
  const mouse = new THREE.Vector2();
  const smoothMouse = new THREE.Vector2();

  window.addEventListener('pointermove', (e) => {
    mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Keep the logo comfortably sized on narrow screens
    pivot.userData.baseScale = w < 768 ? 0.7 : 1;
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = true;

  function render() {
    if (!running) return;
    const t = clock.getElapsedTime();
    smoothMouse.lerp(mouse, 0.06);

    pivot.position.set(state.x, state.y + Math.sin(t * 1.2) * 0.08, state.z);
    pivot.scale.setScalar(state.scale * pivot.userData.baseScale);
    pivot.rotation.y = state.rotY + smoothMouse.x * 0.45 + Math.sin(t * 0.5) * 0.15 * state.spin;
    pivot.rotation.x = state.rotX - smoothMouse.y * 0.3;

    particles.rotation.y = t * 0.03 + smoothMouse.x * 0.1;
    particles.rotation.x = smoothMouse.y * 0.05;
    particles.material.uniforms.uTime.value = t;

    if (logo) {
      logo.material.opacity = state.opacity;
      logo.visible = state.opacity > 0.01;
    }
    canvas.style.opacity = 0.35 + 0.65 * state.opacity;

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(render);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
  });

  return { state, ready };
}

function buildLogo(svg) {
  const { paths } = new SVGLoader().parse(svg);
  const shapes = paths.flatMap((p) => SVGLoader.createShapes(p));

  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: 28,
    bevelEnabled: true,
    bevelThickness: 4,
    bevelSize: 2.5,
    bevelSegments: 6,
    curveSegments: 24,
  });
  geometry.center();
  // SVG y axis points down; flip so the logo is upright
  geometry.scale(0.018, -0.018, 0.018);
  geometry.computeVertexNormals();

  // Bake the brand diagonal gradient into vertex colours
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const nx = (pos.getX(i) - min.x) / (max.x - min.x);
    const ny = (pos.getY(i) - min.y) / (max.y - min.y);
    c.copy(NAVY).lerp(CYAN, THREE.MathUtils.clamp(nx * 0.45 + ny * 0.55, 0, 1));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0.5,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    transparent: true,
  });

  return new THREE.Mesh(geometry, material);
}

function buildParticles(count) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 4 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions.set(
      [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi) - 4],
      i * 3,
    );
    seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uNavy: { value: NAVY },
      uCyan: { value: CYAN },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vSeed;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.4 + aSeed * 6.2831) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + aSeed * 3.0) * uPixelRatio * (8.0 / -mv.z);
        vSeed = aSeed;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uNavy;
      uniform vec3 uCyan;
      uniform float uTime;
      varying float vSeed;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        float twinkle = 0.55 + 0.45 * sin(uTime * 2.0 + vSeed * 40.0);
        gl_FragColor = vec4(mix(uNavy, uCyan, 0.4 + vSeed * 0.6), a * twinkle * 0.8);
      }
    `,
  });

  return new THREE.Points(geometry, material);
}
