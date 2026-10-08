// Three measurements that drive architecture decisions:
//  1. N separate meshes vs one InstancedMesh (draw calls + frame time)
//  2. Continuous loop vs render-on-demand (renders while idle)
//  3. GPU memory after removing objects with and without dispose()
import * as THREE from 'three';
import { createLab, measureFrames } from '../_shared/lab.js';

const lab = createLab('06-three-perf');
const N = 3000;
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas'), antialias: false });
renderer.setSize(innerWidth, innerHeight, false);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.z = 60;
const geo = new THREE.IcosahedronGeometry(0.4, 1);
const mat = new THREE.MeshNormalMaterial();
const rand = () => (Math.random() - 0.5) * 60;

// 1a. separate meshes
let scene = new THREE.Scene();
for (let i = 0; i < N; i++) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(rand(), rand(), rand());
  scene.add(m);
}
const spin = (s) => () => { s.rotation.y += 0.01; renderer.render(s, camera); };
const separate = await measureFrames(90, spin(scene));
lab.set('separateMeshes', { count: N, drawCalls: renderer.info.render.calls, ...separate });

// 1b. instanced
scene = new THREE.Scene();
const inst = new THREE.InstancedMesh(geo, mat, N);
const m4 = new THREE.Matrix4();
for (let i = 0; i < N; i++) inst.setMatrixAt(i, m4.makeTranslation(rand(), rand(), rand()));
scene.add(inst);
const instanced = await measureFrames(90, spin(scene));
lab.set('instancedMesh', { count: N, drawCalls: renderer.info.render.calls, ...instanced });

// 2. demand rendering: count renders in 1s of idling for both strategies
let loopRenders = 0;
renderer.setAnimationLoop(() => { renderer.render(scene, camera); loopRenders++; });
await new Promise((r) => setTimeout(r, 1000));
renderer.setAnimationLoop(null);
let demandRenders = 0, dirty = false;
const invalidate = () => (dirty = true);
const tick = () => { if (dirty) { dirty = false; renderer.render(scene, camera); demandRenders++; } raf = requestAnimationFrame(tick); };
let raf = requestAnimationFrame(tick);
invalidate(); // one render for the initial frame, then idle
await new Promise((r) => setTimeout(r, 1000));
cancelAnimationFrame(raf);
lab.set('rendersPerIdleSecond', { continuousLoop: loopRenders, onDemand: demandRenders });

// 3. dispose vs leak (geometries + textures live on the GPU until disposed)
function churn(dispose) {
  const s = new THREE.Scene();
  const created = [];
  for (let i = 0; i < 40; i++) {
    const tex = new THREE.DataTexture(new Uint8Array(64 * 64 * 4).fill(200), 64, 64);
    tex.needsUpdate = true;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ map: tex }));
    s.add(mesh); created.push(mesh);
  }
  renderer.render(s, camera); // upload to GPU
  for (const mesh of created) {
    s.remove(mesh);
    if (dispose) { mesh.geometry.dispose(); mesh.material.map.dispose(); mesh.material.dispose(); }
  }
  renderer.render(s, camera);
  return { ...renderer.info.memory };
}
renderer.info.reset();
const base = { ...renderer.info.memory };
const leaked = churn(false);
const afterLeak = { geometries: leaked.geometries - base.geometries, textures: leaked.textures - base.textures };
const disposed = churn(true);
lab.set('gpuMemoryDelta_removeOnly', afterLeak);
lab.set('gpuMemoryDelta_withDispose', { geometries: disposed.geometries - leaked.geometries, textures: disposed.textures - leaked.textures });
lab.finish();
