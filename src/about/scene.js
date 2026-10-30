import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { buildLogo, buildParticles } from '../shared/brand3d.js';

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

  const timer = new THREE.Timer();
  timer.connect(document);
  let running = true;

  function render() {
    if (!running) return;
    timer.update();
    const t = timer.getElapsed();
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
