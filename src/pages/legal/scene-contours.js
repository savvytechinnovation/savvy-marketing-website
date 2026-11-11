// Legal header: a calm topographic field — slowly drifting contour lines of a noise surface, drawn in the brand
// blue on a transparent canvas (the page background shows through). Pointer bends the field a little.
import { createStage } from '../fit-check/gl-stage.js';

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2 uRes, uPointer;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.02 + vec2(5.2, 1.3); a *= 0.5; }
    return v;
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    float t = uTime * 0.025;
    p += uPointer * 0.06;
    float f = fbm(p * 1.5 + vec2(t, -t * 0.7));
    f += 0.15 * exp(-length(p - uPointer * vec2(0.9 * uRes.x / uRes.y, 0.5)) * 3.0);
    float k = f * 14.0;
    float d = abs(fract(k) - 0.5);
    float w = fwidth(k);
    float line = smoothstep(w * 1.4, w * 0.3, d) * smoothstep(0.012, 0.045, w);
    float major = step(0.5, fract(floor(k) * 0.2 + 0.1)) ;
    vec3 blue = vec3(0.027, 0.573, 0.761);
    vec3 dark = vec3(0.16, 0.23, 0.67);
    vec3 col = mix(blue, dark, uv.x);
    // stronger on the right (the title sits on the left), fades out at the bottom edge
    float mask = smoothstep(0.15, 0.85, uv.x) * smoothstep(0.0, 0.35, uv.y);
    float a = line * (0.10 + 0.12 * major) * (0.35 + 0.65 * mask);
    gl_FragColor = vec4(col * a, a);
  }
`;

export function mountContours(el) {
  return createStage(el, {
    antialias: false,
    dpr: 1.25,
    build({ THREE, scene, renderer }) {
      const uniforms = { uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uPointer: { value: new THREE.Vector2() } };
      const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: FRAG,
        transparent: true,
        premultipliedAlpha: true,
        depthTest: false,
        depthWrite: false,
      });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      quad.frustumCulled = false;
      scene.add(quad);
      const v = new THREE.Vector2();
      return {
        resize() {
          renderer.getDrawingBufferSize(v);
          uniforms.uRes.value.copy(v);
        },
        update(t, dt, c) {
          uniforms.uTime.value = t + 20;
          uniforms.uPointer.value.copy(c.pointer);
        },
      };
    },
  });
}
