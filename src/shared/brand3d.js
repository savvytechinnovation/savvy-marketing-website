import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

// Brand gradient stops (from the Figma logo: #14173D -> #0396C7)
export const NAVY = new THREE.Color('#14173D');
export const CYAN = new THREE.Color('#0396C7');

/** The Savvy isologo extruded in 3D from the exact Figma SVG path, with the brand gradient baked into vertex colours. */
export function buildLogo(svg) {
  const { paths } = new SVGLoader().parse(svg);
  const shapes = paths.flatMap((p) => p.toShapes());

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

/** Twinkling dust particles in brand colours (additive, depth-write off). */
export function buildParticles(count) {
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
