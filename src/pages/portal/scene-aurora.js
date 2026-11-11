// Portal sign-in backdrop: a live liquid aurora in brand colours (domain-warped fbm, one full-screen shader pass).
//  - every keystroke sends a ripple from the caret position (up to 8 at once)
//  - the focused field gets a soft glow behind the glass panel
//  - busy (signing in) speeds the flow up; an error briefly warms it with the accent
// Rendered at a reduced internal resolution (the field is soft, so it upscales cleanly) to keep it cheap.
import { gsap } from '../../ds/site.js';
import { createStage, isSmall } from '../fit-check/gl-stage.js';

const FRAG = /* glsl */ `
  uniform float uTime, uFocusAmt, uAlert, uBusy;
  uniform vec2 uRes, uFocus;
  uniform vec4 uRip[8];
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    vec2 disp = vec2(0.0);
    float ring = 0.0;
    for (int i = 0; i < 8; i++) {
      vec4 r = uRip[i];
      float age = uTime - r.z;
      if (r.w > 0.0 && age > 0.0 && age < 2.6) {
        vec2 rp = (r.xy * uRes - 0.5 * uRes) / uRes.y;
        vec2 d = p - rp;
        float dist = length(d);
        float w = exp(-pow((dist - age * 0.42) * 12.0, 2.0)) * exp(-age * 1.5) * r.w;
        disp += d / (dist + 0.0001) * w * 0.05;
        ring += w;
      }
    }
    p += disp;
    float t = uTime * (0.05 + uBusy * 0.16);
    vec2 q = vec2(fbm(p * 1.3 + vec2(t, 0.0)), fbm(p * 1.3 + vec2(3.1, -t)));
    float f = fbm(p * 1.1 + q * 1.8 + vec2(t * 0.6, -t * 0.4));
    vec3 navy = vec3(0.022, 0.03, 0.11);
    vec3 dark = vec3(0.13, 0.19, 0.6);
    vec3 cyan = vec3(0.027, 0.57, 0.76);
    vec3 ice = vec3(0.62, 0.92, 1.0);
    vec3 acc = vec3(1.0, 0.33, 0.15);
    vec3 col = mix(navy, dark, smoothstep(0.28, 0.72, f));
    col = mix(col, cyan, smoothstep(0.52, 0.82, f + q.x * 0.25));
    col += ice * pow(smoothstep(0.66, 0.95, f), 3.0) * 0.55;
    // curtain streaks rising from the bottom
    float streak = noise(vec2(p.x * 7.0 + q.y * 2.0, t * 3.0));
    col += cyan * streak * 0.12 * smoothstep(0.6, -0.5, p.y);
    vec2 fp = (uFocus * uRes - 0.5 * uRes) / uRes.y;
    col += cyan * uFocusAmt * 0.45 * exp(-length(p - fp) * 3.2);
    col += ice * ring * 0.4;
    col = mix(col, col * 0.55 + acc * 0.4, uAlert * smoothstep(0.35, 0.8, f));
    col *= 1.12 - 0.45 * length(uv - vec2(0.6, 0.5));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export async function mountAurora(el) {
  const stage = await createStage(el, {
    lazy: false,
    antialias: false,
    dpr: isSmall() ? 0.5 : 0.4,
    build({ THREE, scene, renderer }) {
      const rip = Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, -10, 0));
      const uniforms = {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) },
        uRip: { value: rip },
        uFocus: { value: new THREE.Vector2(0.25, 0.5) },
        uFocusAmt: { value: 0 },
        uAlert: { value: 0 },
        uBusy: { value: 0 },
      };
      const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: FRAG, depthTest: false, depthWrite: false });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      quad.frustumCulled = false;
      scene.add(quad);
      const v = new THREE.Vector2();
      return {
        uniforms,
        rip,
        resize() {
          renderer.getDrawingBufferSize(v);
          uniforms.uRes.value.copy(v);
        },
        update(t) {
          uniforms.uTime.value = t;
        },
      };
    },
  });
  if (!stage) return null;
  const { api, ctx } = stage;
  const reduce = ctx.reduce;
  let k = 0;
  const toUV = (x, y) => {
    const r = el.getBoundingClientRect();
    return [(x - r.left) / r.width, 1 - (y - r.top) / r.height];
  };
  return {
    /** Ripple from a viewport point (strength 0..1.5). */
    ripple(x, y, strength = 1) {
      if (reduce) return;
      const [u, w] = toUV(x, y);
      api.rip[k++ % 8].set(u, w, api.uniforms.uTime.value, strength);
    },
    focus(x, y, on) {
      const [u, w] = toUV(x, y);
      if (on) api.uniforms.uFocus.value.set(u, w);
      gsap.to(api.uniforms.uFocusAmt, { value: on ? 1 : 0, duration: reduce ? 0 : 0.6, ease: 'power2.out', onUpdate: () => stage.invalidate() });
    },
    busy(on) {
      gsap.to(api.uniforms.uBusy, { value: on ? 1 : 0, duration: reduce ? 0 : 0.8, ease: 'power2.inOut' });
    },
    alert() {
      if (reduce) return;
      gsap.timeline().to(api.uniforms.uAlert, { value: 1, duration: 0.35, ease: 'power2.out' }).to(api.uniforms.uAlert, { value: 0, duration: 2.2, ease: 'power2.inOut' });
    },
    destroy: stage.destroy,
  };
}
